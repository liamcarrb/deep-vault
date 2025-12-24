import { Header } from './Header';
import { VaultCreate } from './VaultCreate';
import { VaultOpen } from './VaultOpen';
import '../styles/VaultApp.css';

export function VaultApp() {
  return (
    <div className="vault-app">
      <Header />
      <main className="vault-main">
        <section className="vault-hero">
          <p className="vault-eyebrow">Encrypted document vault</p>
          <h2 className="vault-title">Store a key on-chain. Keep the content yours.</h2>
          <p className="vault-subtitle">
            Deep Vault uses Zama FHE for key escrow and client-side encryption for the document body.
          </p>
        </section>

        <section className="vault-grid">
          <VaultCreate />
          <VaultOpen />
        </section>
      </main>
    </div>
  );
}
