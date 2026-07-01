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
    <div style={{ padding: 16, maxWidth: 500 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Configurações de Segurança</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>
          Fechar
        </button>
      </div>

      <section style={{ marginBottom: 24 }}>
        <h3>Chave Pública</h3>
        <p style={{ fontSize: 13, color: '#666' }}>
          Gerada em: {keyGeneratedAt || 'Desconhecido'}
        </p>
        <button
          onClick={handleRotate}
          disabled={rotating}
          style={{ padding: '8px 16px', cursor: rotating ? 'wait' : 'pointer' }}
        >
          {rotating ? 'Rotacionando...' : 'Rotacionar Chaves'}
        </button>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3>Versões da Chave</h3>
        {versions.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>Nenhuma versão encontrada</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {versions.map(v => (
              <li key={v.version} style={{ padding: '4px 0', fontSize: 13 }}>
                v{v.version} — {new Date(v.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Sessões Ativas ({sessions.length})</h3>
        {sessions.length === 0 ? (
          <p style={{ fontSize: 13, color: '#888' }}>Nenhuma sessão ativa</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sessions.map(s => (
              <li key={s.peerId} style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                <span>
                  {s.active ? '\u{1F512} ' : '\u{1F513} '}
                  {s.peerId.substring(0, 8)}
                </span>
                <button
                  onClick={() => handleRenewSession(s.peerId)}
                  style={{ padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
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
