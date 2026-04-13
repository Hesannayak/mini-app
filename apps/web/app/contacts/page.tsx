'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { isLoggedIn } from '@/lib/store';

const C = { bg: '#080812', card: '#0F0F1E', border: '#1E2040', accent: '#6366F1', green: '#10B981', text: '#EEF2FF', muted: '#8B8BAD', dim: '#5A5A7A' };

interface Contact {
  name: string;
  phone: string;
  upi?: string;
  trusted: boolean;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!isLoggedIn()) router.replace('/login'); }, [router]);

  // Load saved contacts from localStorage (in production: from DB)
  useEffect(() => {
    const saved = localStorage.getItem('mini_contacts');
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  const saveContacts = (c: Contact[]) => {
    setContacts(c);
    localStorage.setItem('mini_contacts', JSON.stringify(c));
  };

  // Import from phone contacts (Chrome Android only)
  const syncPhoneContacts = async () => {
    const nav = navigator as any;
    if (!nav.contacts || !nav.contacts.select) {
      setError('Contact sync only works on Chrome Android. Use manual add below.');
      return;
    }
    setSyncing(true);
    try {
      const selected = await nav.contacts.select(['name', 'tel'], { multiple: true });
      const imported: Contact[] = selected.map((c: any) => ({
        name: c.name?.[0] || 'Unknown',
        phone: c.tel?.[0]?.replace(/\D/g, '').slice(-10) || '',
        trusted: false,
      })).filter((c: Contact) => c.phone.length === 10);

      // Merge with existing
      const existing = new Set(contacts.map(c => c.phone));
      const merged = [...contacts, ...imported.filter((c: Contact) => !existing.has(c.phone))];
      saveContacts(merged);
    } catch {
      setError('Contact import cancelled.');
    } finally {
      setSyncing(false);
    }
  };

  // Manual add
  const addManual = () => {
    if (!manualName.trim() || manualPhone.length !== 10) {
      setError('Name aur 10-digit number daalo');
      return;
    }
    if (contacts.some(c => c.phone === manualPhone)) {
      setError('Ye number already saved hai');
      return;
    }
    saveContacts([...contacts, { name: manualName.trim(), phone: manualPhone, trusted: false }]);
    setManualName('');
    setManualPhone('');
    setError('');
  };

  const toggleTrust = (phone: string) => {
    saveContacts(contacts.map(c => c.phone === phone ? { ...c, trusted: !c.trusted } : c));
  };

  const removeContact = (phone: string) => {
    saveContacts(contacts.filter(c => c.phone !== phone));
  };

  return (
    <div style={{ height: '100vh', height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: C.bg }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '60px 20px 20px' }}>

        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Contacts</h1>
        <p style={{ color: C.dim, fontSize: 14, marginBottom: 24 }}>Trusted contacts get 1-shot pay (no PIN under ₹1,000)</p>

        {/* Sync button */}
        <button onClick={syncPhoneContacts} disabled={syncing}
          style={{ width: '100%', backgroundColor: C.accent, border: 'none', borderRadius: 14, padding: '14px 0', color: '#FFF', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 16, opacity: syncing ? 0.6 : 1 }}>
          {syncing ? 'Importing...' : 'Import Phone Contacts'}
        </button>

        {/* Manual add */}
        <div style={{ backgroundColor: C.card, borderRadius: 18, border: `1px solid ${C.border}`, padding: 16, marginBottom: 24 }}>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Or add manually:</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="text" placeholder="Name" value={manualName} onChange={e => setManualName(e.target.value)}
              style={{ flex: 1, backgroundColor: '#14142A', borderRadius: 10, border: `1px solid ${C.border}`, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }} />
            <input type="tel" placeholder="Phone" maxLength={10} value={manualPhone} onChange={e => setManualPhone(e.target.value.replace(/\D/g, ''))}
              style={{ width: 120, backgroundColor: '#14142A', borderRadius: 10, border: `1px solid ${C.border}`, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }} />
          </div>
          <button onClick={addManual}
            style={{ width: '100%', backgroundColor: '#14142A', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 0', color: C.muted, fontSize: 14, cursor: 'pointer' }}>
            Add Contact
          </button>
        </div>

        {error && <p style={{ color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{error}</p>}

        {/* Contact list */}
        <h2 style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          Saved ({contacts.length})
        </h2>
        {contacts.length === 0 ? (
          <p style={{ color: C.dim, textAlign: 'center', padding: '32px 0' }}>No contacts yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 16 }}>
            {contacts.map(c => (
              <div key={c.phone} style={{ display: 'flex', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: '12px 16px', border: `1px solid ${C.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#14142A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 }}>
                  <span style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>{c.name[0].toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: C.text, fontSize: 15, fontWeight: 500 }}>{c.name}</p>
                  <p style={{ color: C.dim, fontSize: 12, marginTop: 1 }}>+91 {c.phone}</p>
                </div>
                <button onClick={() => toggleTrust(c.phone)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, backgroundColor: c.trusted ? C.green : '#14142A', color: c.trusted ? '#FFF' : C.dim, marginRight: 8 }}>
                  {c.trusted ? 'Trusted' : 'Trust'}
                </button>
                <button onClick={() => removeContact(c.phone)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, backgroundColor: 'transparent', color: C.dim }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
