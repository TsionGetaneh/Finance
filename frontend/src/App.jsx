import React, { useState, useEffect } from "react";
import {
  Wallet,
  Users,
  Banknote,
  ShieldCheck,
  Plus,
  ChevronRight,
  History as HistoryIcon,
  UserCheck,
  Scale,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
} from "lucide-react";
import EqubDashboard from "./components/EqubDashboard";
import LendingDashboard from "./components/LendingDashboard";
import ReputationBadge from "./components/ReputationBadge";
import { useWeb3 } from "./hooks/useWeb3";
import { ethers } from "ethers";

function App() {
  const [activeTab, setActiveTab] = useState("equb");
  const { account, contracts, connect, provider, network } = useWeb3();
  const [reputation, setReputation] = useState(500);
  const [history, setHistory] = useState([]);
  const [balance, setBalance] = useState("0");
  const [vouchAddress, setVouchAddress] = useState("");
  const [loadingVouch, setLoadingVouch] = useState(false);

  const isSepolia = network?.chainId === 11155111n;

  const fetchBalance = async () => {
    if (provider && account) {
      try {
        const bal = await provider.getBalance(account);
        setBalance(ethers.formatEther(bal));
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    }
  };

  const fetchReputation = async () => {
    if (contracts.ReputationSystem && account) {
      try {
        const score = await contracts.ReputationSystem.getReputationScore(
          account,
        );
        setReputation(Number(score));
      } catch (error) {
        console.error("Error fetching reputation:", error);
      }
    }
  };

  const fetchHistory = async () => {
    if (contracts.ReputationSystem && account) {
      try {
        const normalizedAccount = account.toLowerCase();

        // Fetch all relevant events
        const filterScore =
          contracts.ReputationSystem.filters.ScoreUpdated(account);
        const filterVouch = contracts.ReputationSystem.filters.Vouched(
          null,
          account,
        );

        const [scoreEvents, vouchEvents] = await Promise.all([
          contracts.ReputationSystem.queryFilter(filterScore, -2000),
          contracts.ReputationSystem.queryFilter(filterVouch, -2000),
        ]);

        const items = [
          ...scoreEvents.map((e) => ({
            id: `score-${e.transactionHash}`,
            title: "Score Updated",
            time: "Recent",
            impact: "Points Updated",
            icon: <ShieldCheck size={14} />,
            block: e.blockNumber,
          })),
          ...vouchEvents.map((e) => ({
            id: `vouch-${e.transactionHash}`,
            title: "Received Vouch",
            time: "Recent",
            impact: "+1 Vouch",
            icon: <UserCheck size={14} />,
            block: e.blockNumber,
          })),
        ].sort((a, b) => b.block - a.block);

        setHistory(items);
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    }
  };

  const [disputes, setDisputes] = useState([]);
  const [showRaiseDispute, setShowRaiseDispute] = useState(false);
  const [disputeForm, setDisputeForm] = useState({
    accused: "",
    description: "",
  });

  const fetchDisputes = async () => {
    if (!contracts.Governance) return;
    try {
      const nextId = await contracts.Governance.nextDisputeId();
      const items = [];
      for (let i = 0; i < Number(nextId); i++) {
        const d = await contracts.Governance.disputes(i);
        items.push({
          id: i,
          accused: d.accused,
          description: d.description,
          votesFor: Number(d.votesFor),
          votesAgainst: Number(d.votesAgainst),
          deadline: new Date(Number(d.deadline) * 1000).toLocaleDateString(),
          resolved: d.resolved,
          result: d.result,
        });
      }
      setDisputes(items);
    } catch (error) {
      console.error("Error fetching disputes:", error);
    }
  };

  useEffect(() => {
    if (account) {
      fetchBalance();
      fetchReputation();
      fetchHistory();
      fetchDisputes();
    }
  }, [contracts, account]);

  const handleRaiseDispute = async (e) => {
    e.preventDefault();
    try {
      const tx = await contracts.Governance.raiseDispute(
        disputeForm.accused,
        disputeForm.description,
      );
      await tx.wait();
      alert("Dispute raised!");
      setShowRaiseDispute(false);
      fetchDisputes();
    } catch (error) {
      console.error("Dispute failed:", error);
      alert("Failed to raise dispute. Needs 500+ reputation.");
    }
  };

  const handleVote = async (id, support) => {
    try {
      const tx = await contracts.Governance.vote(id, support);
      await tx.wait();
      alert("Vote recorded!");
      fetchDisputes();
    } catch (error) {
      console.error("Vote failed:", error);
    }
  };

  const handleVouch = async () => {
    if (!contracts.ReputationSystem || !vouchAddress) return;
    try {
      setLoadingVouch(true);
      const tx = await contracts.ReputationSystem.vouch(vouchAddress);
      await tx.wait();
      alert("Vouch successful!");
      setVouchAddress("");
      fetchReputation();
    } catch (error) {
      console.error("Vouch failed:", error);
      alert("Vouch failed. Needs 500+ reputation to vouch.");
    } finally {
      setLoadingVouch(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col md:max-w-2xl lg:max-w-4xl mx-auto shadow-xl md:my-8 md:rounded-3xl overflow-hidden">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-6 rounded-b-3xl shadow-lg relative">
        {!isSepolia && account && (
          <div className="absolute top-0 left-0 w-full bg-red-500 text-[10px] font-black uppercase text-center py-1">
            Wrong Network! Please switch to Sepolia (Chain ID: 11155111)
          </div>
        )}
        <div className="flex justify-between items-center mb-6 pt-2">
          <h1 className="text-2xl font-bold">EthioTrust</h1>
          <button
            onClick={connect}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
          >
            <Wallet size={24} />
          </button>
        </div>

        {account ? (
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm opacity-80">Welcome back,</p>
                <p className="font-mono text-xs truncate bg-black/10 p-2 rounded w-48">
                  {account}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold opacity-60">
                  Balance
                </p>
                <p className="text-xl font-black">
                  {parseFloat(balance).toLocaleString()} ETH
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <ReputationBadge score={reputation} />
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <button
              onClick={connect}
              className="bg-white text-indigo-600 font-bold py-2 px-6 rounded-full shadow-md"
            >
              Connect Wallet
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === "equb" && (
          <EqubDashboard
            account={account}
            contracts={contracts}
            provider={provider}
          />
        )}
        {activeTab === "lending" && (
          <LendingDashboard account={account} contracts={contracts} />
        )}
        {activeTab === "reputation" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" /> My Reputation
            </h2>
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 text-center">
              <div className="text-6xl font-black text-indigo-600 mb-2">
                {reputation}
              </div>
              <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
                Trust Score
              </p>
              <div className="mt-6 w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${reputation / 10}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h3 className="font-bold mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2 text-indigo-600">
                  <Scale size={20} /> Community Disputes
                </span>
                <button
                  onClick={() => setShowRaiseDispute(true)}
                  className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                >
                  Raise New
                </button>
              </h3>

              {showRaiseDispute && (
                <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top duration-300">
                  <form onSubmit={handleRaiseDispute} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Address to accuse"
                      value={disputeForm.accused}
                      onChange={(e) =>
                        setDisputeForm({
                          ...disputeForm,
                          accused: e.target.value,
                        })
                      }
                      className="w-full p-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-2 ring-indigo-500 font-mono text-xs"
                      required
                    />
                    <textarea
                      placeholder="Description of the incident"
                      value={disputeForm.description}
                      onChange={(e) =>
                        setDisputeForm({
                          ...disputeForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full p-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-2 ring-indigo-500 text-sm"
                      rows="3"
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRaiseDispute(false)}
                        className="flex-1 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg"
                      >
                        Raise Dispute
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                {disputes.length === 0 ? (
                  <p className="text-center text-gray-400 py-4 font-medium italic">
                    No active community disputes.
                  </p>
                ) : (
                  disputes.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-800">
                            Case #{d.id}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate w-32 font-mono uppercase">
                            {d.accused}
                          </p>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                            d.resolved
                              ? "bg-gray-200 text-gray-600"
                              : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          {d.resolved
                            ? d.result
                              ? "Guilty"
                              : "Innocent"
                            : "Voting Open"}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed bg-white/50 p-3 rounded-xl italic">
                        "{d.description}"
                      </p>

                      {!d.resolved && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleVote(d.id, true)}
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-50 text-green-600 rounded-xl font-black text-[10px] uppercase hover:bg-green-100 transition-colors"
                          >
                            <ThumbsUp size={14} /> Guilty
                          </button>
                          <button
                            onClick={() => handleVote(d.id, false)}
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase hover:bg-red-100 transition-colors"
                          >
                            <ThumbsDown size={14} /> Innocent
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold px-1">
                        <span>Deadline: {d.deadline}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-green-500">
                            {d.votesFor} For
                          </span>
                          <span className="text-red-500">
                            {d.votesAgainst} Against
                          </span>
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <UserCheck size={20} className="text-indigo-600" /> Vouch for
                Someone
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Address to vouch for"
                  value={vouchAddress}
                  onChange={(e) => setVouchAddress(e.target.value)}
                  className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 ring-indigo-500 font-mono text-xs"
                />
                <button
                  onClick={handleVouch}
                  disabled={loadingVouch}
                  className="bg-indigo-600 text-white font-black px-6 rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loadingVouch ? "..." : "Vouch"}
                </button>
              </div>
              <p className="mt-3 text-[10px] text-gray-400 font-medium">
                Vouching increases their score and helps them qualify for loans.
              </p>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <HistoryIcon size={20} className="text-indigo-600" /> Activity
                History
              </h3>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 font-medium">
                    No recent activity.
                  </p>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                          {item.icon}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">
                            {item.title}
                          </p>
                          <p className="text-xs text-gray-400 font-medium">
                            {item.time}
                          </p>
                        </div>
                      </div>
                      <div className="text-indigo-600 font-black text-sm">
                        {item.impact}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-100 p-6 flex justify-around items-center sticky bottom-0 rounded-t-3xl shadow-2xl">
        <button
          onClick={() => setActiveTab("equb")}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === "equb" ? "text-indigo-600 scale-110" : "text-gray-300"
          }`}
        >
          <Users size={28} />
          <span className="text-[10px] font-black uppercase tracking-tighter">
            Equb
          </span>
        </button>
        <button
          onClick={() => setActiveTab("lending")}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === "lending"
              ? "text-indigo-600 scale-110"
              : "text-gray-300"
          }`}
        >
          <Banknote size={28} />
          <span className="text-[10px] font-black uppercase tracking-tighter">
            Loans
          </span>
        </button>
        <button
          onClick={() => setActiveTab("reputation")}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === "reputation"
              ? "text-indigo-600 scale-110"
              : "text-gray-300"
          }`}
        >
          <ShieldCheck size={28} />
          <span className="text-[10px] font-black uppercase tracking-tighter">
            Trust
          </span>
        </button>
      </nav>
    </div>
  );
}

export default App;
