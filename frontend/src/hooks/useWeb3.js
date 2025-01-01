import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ABIS } from '../contracts';

export const useWeb3 = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [contracts, setContracts] = useState({});

  const [network, setNetwork] = useState(null);

  const connect = async () => {
    if (window.ethereum) {
      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _network = await _provider.getNetwork();
      setNetwork(_network);
      
      const _signer = await _provider.getSigner();
      const _account = await _signer.getAddress();
      
      setProvider(_provider);
      setSigner(_signer);
      setAccount(_account);

      const _contracts = {};
      Object.keys(CONTRACT_ADDRESSES).forEach(name => {
        _contracts[name] = new ethers.Contract(
          CONTRACT_ADDRESSES[name],
          ABIS[name],
          _signer
        );
      });
      setContracts(_contracts);
      return _account;
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) connect();
        else setAccount(null);
      });
      
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return { account, contracts, connect, provider, signer, network };
};
