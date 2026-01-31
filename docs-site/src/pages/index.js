import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import clsx from 'clsx';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', 'hero--primary')} style={{
      background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fdba74 100%)',
      padding: '4rem 0',
    }}>
      <div className="container">
        <h1 className="hero__title" style={{color: '#1f2937', fontSize: '3rem'}}>
          {siteConfig.title}
        </h1>
        <p className="hero__subtitle" style={{color: '#374151', fontSize: '1.5rem'}}>
          {siteConfig.tagline}
        </p>
        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem'}}>
          <Link
            className="button button--lg"
            to="/docs/intro"
            style={{
              backgroundColor: '#f97316',
              color: 'white',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '8px',
            }}>
            Get Started
          </Link>
          <Link
            className="button button--lg button--secondary"
            to="/docs/architecture/overview"
            style={{
              backgroundColor: 'white',
              color: '#f97316',
              border: '2px solid #f97316',
              padding: '0.75rem 2rem',
              borderRadius: '8px',
            }}>
            Architecture
          </Link>
        </div>
      </div>
    </header>
  );
}

function Feature({title, description, icon}) {
  return (
    <div style={{
      flex: '1',
      padding: '2rem',
      textAlign: 'center',
      minWidth: '250px',
    }}>
      <div style={{fontSize: '3rem', marginBottom: '1rem'}}>{icon}</div>
      <h3 style={{color: '#1f2937'}}>{title}</h3>
      <p style={{color: '#4b5563'}}>{description}</p>
    </div>
  );
}

function HomepageFeatures() {
  const features = [
    {
      title: 'FHE Encryption',
      icon: '🔐',
      description: 'Fully Homomorphic Encryption keeps salaries, balances, and identities encrypted on-chain.',
    },
    {
      title: 'Confidential Transfers',
      icon: '💸',
      description: 'All deposits and withdrawals use encrypted amounts - observers see nothing.',
    },
    {
      title: 'Real-time Streaming',
      icon: '⚡',
      description: 'MagicBlock TEE enables sub-second salary streaming with privacy.',
    },
    {
      title: 'Index-Based Privacy',
      icon: '🔒',
      description: 'No pubkeys in PDA seeds - employer/employee relationships are hidden.',
    },
  ];

  return (
    <section style={{
      padding: '4rem 0',
      backgroundColor: '#fefefe',
    }}>
      <div className="container">
        <h2 style={{textAlign: 'center', color: '#1f2937', marginBottom: '3rem'}}>
          Maximum Privacy Payroll
        </h2>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '1rem',
        }}>
          {features.map((feature, idx) => (
            <Feature key={idx} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TechStack() {
  const techs = [
    { name: 'Inco Lightning', desc: 'FHE Engine' },
    { name: 'Inco Tokens', desc: 'Confidential Transfers' },
    { name: 'MagicBlock', desc: 'TEE Streaming' },
    { name: 'Helius', desc: 'RPC Infrastructure' },
    { name: 'Solana', desc: 'Blockchain' },
  ];

  return (
    <section style={{
      padding: '3rem 0',
      backgroundColor: '#f9fafb',
    }}>
      <div className="container">
        <h2 style={{textAlign: 'center', color: '#1f2937', marginBottom: '2rem'}}>
          Powered By
        </h2>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '2rem',
        }}>
          {techs.map((tech, idx) => (
            <div key={idx} style={{
              padding: '1rem 2rem',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'center',
            }}>
              <div style={{fontWeight: 'bold', color: '#f97316'}}>{tech.name}</div>
              <div style={{fontSize: '0.875rem', color: '#6b7280'}}>{tech.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickLinks() {
  const links = [
    { title: 'Getting Started', to: '/docs/getting-started', desc: 'Quick setup guide' },
    { title: 'Core Concepts', to: '/docs/core-concepts/privacy-layer', desc: 'Privacy architecture' },
    { title: 'API Reference', to: '/docs/reference/program-api', desc: 'Full program API' },
    { title: 'TypeScript SDK', to: '/docs/reference/typescript-sdk', desc: 'Client integration' },
  ];

  return (
    <section style={{
      padding: '4rem 0',
      backgroundColor: '#fefefe',
    }}>
      <div className="container">
        <h2 style={{textAlign: 'center', color: '#1f2937', marginBottom: '2rem'}}>
          Documentation
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          {links.map((link, idx) => (
            <Link key={idx} to={link.to} style={{textDecoration: 'none'}}>
              <div style={{
                padding: '1.5rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                transition: 'all 0.2s',
              }}>
                <h3 style={{color: '#f97316', margin: '0 0 0.5rem 0'}}>{link.title}</h3>
                <p style={{color: '#6b7280', margin: 0, fontSize: '0.875rem'}}>{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Documentation`}
      description="Privacy-first payroll infrastructure on Solana with FHE encryption">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <TechStack />
        <QuickLinks />
      </main>
    </Layout>
  );
}
