import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCrypto } from '@/hooks/useCrypto';
import { loadPublicKeyBase64 } from '@/crypto/keypair';
import { getActiveSessions, hasSession } from '@/crypto/session';
import { fetchPublicKeyVersions } from '@/api/http';

interface SecuritySettingsProps {
  onClose: () => void;
}

export function SecuritySettings({ onClose }: SecuritySettingsProps) {
  const { user } = useAuth();
  const { rotateKeys, renewSession } = useCrypto();
  const [keyGeneratedAt, setKeyGeneratedAt] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{ peerId: string; active: boolean }>>([]);
  const [versions, setVersions] = useState<Array<{ version: number; createdAt: number }>>([]);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const pubKey = loadPublicKeyBase64(user.id);
    if (pubKey) {
      setKeyGeneratedAt(new Date().toLocaleString());
    }
    setSessions(getActiveSessions().map(peerId => ({ peerId, active: hasSession(peerId) })));
    fetchPublicKeyVersions(user.id).then(res => {
      setVersions(res.versions);
    }).catch(() => {});
  }, [user]);

  const handleRotate = async () => {
    setRotating(true);
    try {
      await rotateKeys();
      if (user) {
        setVersions([]);
        fetchPublicKeyVersions(user.id).then(res => {
          setVersions(res.versions);
        }).catch(() => {});
        setSessions(getActiveSessions().map(peerId => ({ peerId, active: hasSession(peerId) })));
      }
    } catch (err) {
      console.error('[Security] Key rotation failed:', err);
    } finally {
      setRotating(false);
    }
  };

  const handleRenewSession = async (peerId: string) => {
    try {
      await renewSession(peerId);
      setSessions(getActiveSessions().map(pid => ({ peerId: pid, active: hasSession(pid) })));
    } catch (err) {
      console.error('[Security] Session renewal failed:', err);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto text-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-100">Configurações de Segurança</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 bg-transparent border-none text-lg"
        >
          Fechar
        </button>
      </div>

      <section className="mb-6 bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">Chave Pública</h3>
        <p className="text-sm text-gray-400 mb-3">
          Gerada em: {keyGeneratedAt || 'Desconhecido'}
        </p>
        <button
          onClick={handleRotate}
          disabled={rotating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {rotating ? 'Rotacionando...' : 'Rotacionar Chaves'}
        </button>
      </section>

      <section className="mb-6 bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">Versões da Chave</h3>
        {versions.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma versão encontrada</p>
        ) : (
          <ul className="list-none p-0 m-0">
            {versions.map(v => (
              <li key={v.version} className="py-1 text-sm text-gray-400">
                v{v.version} — {new Date(v.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">Sessões Ativas ({sessions.length})</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma sessão ativa</p>
        ) : (
          <ul className="list-none p-0 m-0">
            {sessions.map(s => (
              <li key={s.peerId} className="py-3 flex items-center justify-between border-b border-gray-700/50 last:border-none">
                <span className="text-gray-300 text-sm">
                  {s.active ? '\u{1F512} ' : '\u{1F513} '}
                  {s.peerId.substring(0, 8)}
                </span>
                <button
                  onClick={() => handleRenewSession(s.peerId)}
                  className="px-3 py-1.5 text-xs border border-gray-600 rounded-md text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors bg-transparent"
                >
                  Renovar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}