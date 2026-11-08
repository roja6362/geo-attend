import { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Link as LinkIcon, ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

export default function BlockchainExplorer() {
  const [chainData, setChainData] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChain();
    verifyChain();
  }, []);

  const fetchChain = async () => {
    try {
      const res = await axios.get(`${API_URL}/blockchain/`);
      setChainData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verifyChain = async () => {
    try {
      const res = await axios.get(`${API_URL}/blockchain/verify`);
      setVerification(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10">
      {/* Navigation */}
      <nav className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="h-9 w-9 rounded-xl bg-slate-900 border border-blue-500/50 p-1 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:border-blue-400 group-hover:scale-105 transition-all">
                <img src="/favicon.svg" alt="Geo-Attend Logo" className="h-full w-full object-contain filter drop-shadow(0 0 6px rgba(59,130,246,0.4))" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-white">
                Geo-Chain Ledger Explorer
              </span>
            </Link>
            <Link to="/" className="flex items-center text-sm font-medium text-gray-300 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5 mr-1" /> Back to Portals
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Blockchain Ledger</h1>
            <p className="text-sm text-gray-505">Block Height: {chainData?.chain?.length || 0}</p>
          </div>
          {verification && (
            <div className={`px-4 py-2 rounded-lg flex items-center ${verification.is_valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {verification.is_valid ? <ShieldCheck className="mr-2 h-5 w-5" /> : <ShieldAlert className="mr-2 h-5 w-5" />}
              <span className="text-sm font-medium">{verification.msg}</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">Loading blockchain...</div>
          ) : (
            chainData?.chain?.map(block => (
              <div key={block.block_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-150 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-150 dark:border-gray-700 flex justify-between items-center">
                  <span className="font-semibold text-gray-805 dark:text-white">Block #{block.block_id}</span>
                  <span className="text-xs text-gray-500">{new Date(block.timestamp * 1000).toLocaleString()}</span>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hash Info */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Hash</p>
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded text-blue-600 dark:text-blue-400 break-all border border-gray-200 dark:border-gray-700 shadow-inner">
                        {block.current_hash}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center">
                        <LinkIcon className="h-3 w-3 mr-1" /> Previous Hash
                      </p>
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded text-gray-600 dark:text-gray-400 break-all border border-gray-200 dark:border-gray-700 shadow-inner">
                        {block.previous_hash}
                      </p>
                    </div>
                  </div>
                  
                  {/* Block Data */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Attendance Data</p>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto shadow-inner border border-gray-800">
                      <pre>{JSON.stringify(block.data, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
