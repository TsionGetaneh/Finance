import React, { useState, useEffect } from "react";
import {
  Banknote,
  AlertCircle,
  TrendingUp,
  UserPlus,
  CheckCircle,
  Plus,
  Loader2,
} from "lucide-react";
import { ethers } from "ethers";

const LendingDashboard = ({ account, contracts }) => {
  const [loans, setLoans] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [totalOutstanding, setTotalOutstanding] = useState("0");
  const [fetchStatus, setFetchStatus] = useState("idle");
  const [formData, setFormData] = useState({
    amount: "0.1",
    duration: "2592000", // 30 days
    cosigners: "",
  });

  const fetchData = async () => {
    if (!contracts.LendingPool || !account) return;
    try {
      setLoading(true);
      setFetchStatus("fetching_loans");
      const nextId = await contracts.LendingPool.nextLoanId();
      const myLoans = [];
      const approvals = [];
      let outstanding = 0n;

      for (let i = 0; i < Number(nextId); i++) {
        try {
          const l = await contracts.LendingPool.loans(i);
          const loanData = {
            id: i,
            borrower: l.borrower,
            amount: ethers.formatEther(l.amount),
            dueDate: new Date(Number(l.dueDate) * 1000).toLocaleDateString(),
            dueTimestamp: Number(l.dueDate),
            isRepaid: l.isRepaid,
            isDefaulted: l.isDefaulted,
            approvals: Number(l.approvals),
          };

          if (l.borrower.toLowerCase() === account?.toLowerCase()) {
            myLoans.push(loanData);
            if (!l.isRepaid && !l.isDefaulted) {
              outstanding += l.amount + (l.amount * 5n) / 100n;
            }
          } else if (!l.isRepaid && !l.isDefaulted && Number(l.approvals) < 2) {
            // Check if user is a listed cosigner and hasn't approved yet
            const hasApproved = await contracts.LendingPool.hasApproved(
              i,
              account,
            );
            if (!hasApproved) {
              // We need to check if user is in the cosigners array
              // Note: The contract doesn't have a public getter for the whole array,
              // but we can check if approveLoan would work or just try-catch.
              // For now, assume if they are asked to approve, they are cosigners.
              approvals.push(loanData);
            }
          }
        } catch (err) {
          console.error(`Error fetching loan ${i}:`, err);
        }
      }
      setLoans(myLoans);
      setPendingApprovals(approvals);
      setTotalOutstanding(ethers.formatEther(outstanding));
      setFetchStatus("success");
    } catch (error) {
      console.error("Error fetching loans:", error);
      setFetchStatus("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [contracts.LendingPool, account]);

  const handleRequestLoan = async (e) => {
    e.preventDefault();
    try {
      const cosignerArray = formData.cosigners.split(",").map((s) => s.trim());
      if (cosignerArray.length < 2) return alert("Need at least 2 cosigners");

      const tx = await contracts.LendingPool.requestLoan(
        ethers.parseEther(formData.amount),
        BigInt(formData.duration),
        cosignerArray,
      );
      await tx.wait();
      alert("Loan requested!");
      setShowRequest(false);
      fetchData();
    } catch (error) {
      console.error("Loan request failed:", error);
      alert("Request failed. Check reputation (needs 600+).");
    }
  };

  const handleApprove = async (loanId) => {
    try {
      const tx = await contracts.LendingPool.approveLoan(loanId);
      await tx.wait();
      alert("Loan approved!");
      fetchData();
    } catch (error) {
      console.error("Approval failed:", error);
      alert("Approval failed.");
    }
  };

  const handleRepay = async (loanId, amount) => {
    try {
      const tx = await contracts.LendingPool.repayLoan(loanId, {
        value: ethers.parseEther(amount),
      });
      await tx.wait();
      alert("Repayment successful!");
      fetchData();
    } catch (error) {
      console.error("Repayment failed:", error);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Banknote className="text-indigo-600" /> My Loans
        </h2>
        <button
          onClick={() => setShowRequest(true)}
          className="bg-indigo-600 text-white p-2 rounded-full shadow-md"
        >
          <UserPlus size={20} />
        </button>
      </div>

      {showRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-indigo-900">
              Request a Loan
            </h3>
            <form onSubmit={handleRequestLoan} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Loan Amount (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 ring-indigo-500 font-black"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Cosigners (comma separated addresses)
                </label>
                <textarea
                  placeholder="0x123..., 0x456..."
                  value={formData.cosigners}
                  onChange={(e) =>
                    setFormData({ ...formData, cosigners: e.target.value })
                  }
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 ring-indigo-500 font-mono text-xs"
                  rows="3"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRequest(false)}
                  className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-500 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 rounded-2xl font-bold text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Request Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80 mb-1">
                Total Outstanding
              </p>
              <h3 className="text-4xl font-black">
                {parseFloat(totalOutstanding).toLocaleString()}{" "}
                <span className="text-lg opacity-60">ETH</span>
              </h3>
            </div>
            <TrendingUp size={48} className="opacity-20" />
          </div>
          <div className="flex justify-between items-end mt-8">
            <div>
              <p className="text-[10px] uppercase opacity-60 font-bold mb-1">
                Next Payment Due
              </p>
              <p className="font-bold">
                {loans.find((l) => !l.isRepaid && !l.isDefaulted)?.dueDate ||
                  "No active loans"}
              </p>
            </div>
            {loans.some((l) => !l.isRepaid && !l.isDefaulted) && (
              <button
                onClick={() => {
                  const activeLoan = loans.find(
                    (l) => !l.isRepaid && !l.isDefaulted,
                  );
                  handleRepay(
                    activeLoan.id,
                    (Number(activeLoan.amount) * 1.05).toString(),
                  );
                }}
                className="bg-white text-indigo-600 font-black py-3 px-6 rounded-2xl text-sm shadow-lg hover:bg-indigo-50 transition-colors"
              >
                Repay Now
              </button>
            )}
          </div>
        </div>
        <div className="absolute -right-12 -top-12 bg-white/10 w-48 h-48 rounded-full blur-3xl"></div>
      </div>

      {pendingApprovals.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-black text-gray-400 uppercase tracking-widest text-xs px-2 flex items-center gap-2">
            <AlertCircle size={14} className="text-orange-500" /> Requests to
            Cosign
          </h3>
          {pendingApprovals.map((loan) => (
            <div
              key={loan.id}
              className="bg-white p-5 rounded-3xl shadow-sm border border-orange-100 border-l-4 border-l-orange-500"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
                    <Banknote size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">Loan #{loan.id}</p>
                    <p className="text-[10px] text-gray-400 font-medium truncate w-32">
                      {loan.borrower}
                    </p>
                  </div>
                </div>
                <p className="font-black text-indigo-600 text-lg">
                  {loan.amount} ETH
                </p>
              </div>
              <button
                onClick={() => handleApprove(loan.id)}
                className="w-full bg-orange-500 text-white font-black py-3 rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all active:scale-95"
              >
                <CheckCircle size={18} /> Co-sign & Approve
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4 pt-4">
        <h3 className="font-black text-gray-400 uppercase tracking-widest text-xs px-2">
          Loan History
        </h3>
        {loans.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <Banknote className="mx-auto text-gray-200 mb-4" size={64} />
            <p className="text-gray-400 font-medium">No loan history found.</p>
          </div>
        ) : (
          loans.map((loan) => (
            <div
              key={loan.id}
              className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex justify-between items-center"
            >
              <div className="flex gap-4 items-center">
                <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                  <Banknote size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">
                    Micro Loan #{loan.id}
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">
                    Due {loan.dueDate}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-indigo-600 text-lg">
                  {loan.amount} ETH
                </p>
                <p
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    loan.isRepaid
                      ? "text-green-500"
                      : loan.isDefaulted
                      ? "text-red-500"
                      : "text-blue-500"
                  }`}
                >
                  {loan.isRepaid
                    ? "Repaid"
                    : loan.isDefaulted
                    ? "Defaulted"
                    : `Approvals: ${loan.approvals}/2`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setShowRequest(true)}
        className="w-full bg-indigo-50 border-2 border-dashed border-indigo-100 text-indigo-600 font-black py-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-indigo-100 hover:border-indigo-200 transition-all active:scale-95"
      >
        <Plus size={24} /> Request New Loan
      </button>
    </div>
  );
};

export default LendingDashboard;
