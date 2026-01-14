/**
 * Bagel Documentation Sidebars
 *
 * Creating a sidebar enables you to:
 * - create an ordered group of docs
 * - render a sidebar for each doc of that group
 * - provide next/previous navigation
 */

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    // Getting Started Section
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'intro',
        'getting-started',
        'installation',
        'usage-basics',
      ],
    },

    // Architecture Section
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/modules',
        'architecture/data-flow',
      ],
    },

    // Core Concepts Section
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: [
        'core-concepts/payroll-jar',
        'core-concepts/privacy-layer',
        'core-concepts/yield-generation',
        'core-concepts/glossary',
      ],
    },

    // API Reference Section
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: [
        'reference/program',
        'reference/typescript-client',
      ],
    },

    // Resources Section
    {
      type: 'category',
      label: 'Resources',
      collapsed: false,
      items: [
        'security',
        'faq',
        'troubleshooting',
      ],
    },
  ],
};

module.exports = sidebars;
