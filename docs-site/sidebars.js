/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    'intro',
    'getting-started',
    'installation',
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'core-concepts/privacy-layer',
        'core-concepts/fhe-encryption',
        'core-concepts/payroll-streaming',
        'core-concepts/confidential-tokens',
        'core-concepts/glossary',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/accounts',
        'architecture/instructions',
        'architecture/data-flow',
        'architecture/mathematics',
      ],
    },
    {
      type: 'category',
      label: 'Integration',
      items: [
        'integration/inco-lightning',
        'integration/confidential-tokens',
        'integration/magicblock-tee',
        'integration/helius-rpc',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/program-api',
        'reference/typescript-sdk',
        'reference/error-codes',
        'reference/events',
      ],
    },
    'security',
    'faq',
    'troubleshooting',
  ],
};

module.exports = sidebars;
