import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/search',
    component: ComponentCreator('/search', '822'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '531'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '87d'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'e06'),
            routes: [
              {
                path: '/docs/architecture/accounts',
                component: ComponentCreator('/docs/architecture/accounts', '2f0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/architecture/data-flow',
                component: ComponentCreator('/docs/architecture/data-flow', '6bc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/architecture/instructions',
                component: ComponentCreator('/docs/architecture/instructions', 'f65'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/architecture/mathematics',
                component: ComponentCreator('/docs/architecture/mathematics', 'd73'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/architecture/overview',
                component: ComponentCreator('/docs/architecture/overview', '833'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/core-concepts/confidential-tokens',
                component: ComponentCreator('/docs/core-concepts/confidential-tokens', '466'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/core-concepts/fhe-encryption',
                component: ComponentCreator('/docs/core-concepts/fhe-encryption', '902'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/core-concepts/glossary',
                component: ComponentCreator('/docs/core-concepts/glossary', '7c3'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/core-concepts/payroll-streaming',
                component: ComponentCreator('/docs/core-concepts/payroll-streaming', '520'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/core-concepts/privacy-layer',
                component: ComponentCreator('/docs/core-concepts/privacy-layer', '617'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/faq',
                component: ComponentCreator('/docs/faq', '947'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/getting-started',
                component: ComponentCreator('/docs/getting-started', '2a1'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/installation',
                component: ComponentCreator('/docs/installation', 'b74'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/integration/confidential-tokens',
                component: ComponentCreator('/docs/integration/confidential-tokens', 'e8a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/integration/helius-rpc',
                component: ComponentCreator('/docs/integration/helius-rpc', '56f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/integration/inco-lightning',
                component: ComponentCreator('/docs/integration/inco-lightning', 'de4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/integration/magicblock-tee',
                component: ComponentCreator('/docs/integration/magicblock-tee', 'f54'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '61d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/reference/error-codes',
                component: ComponentCreator('/docs/reference/error-codes', '258'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/reference/events',
                component: ComponentCreator('/docs/reference/events', '16c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/reference/program-api',
                component: ComponentCreator('/docs/reference/program-api', '4a4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/reference/typescript-sdk',
                component: ComponentCreator('/docs/reference/typescript-sdk', '4f2'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/security',
                component: ComponentCreator('/docs/security', '3ef'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/troubleshooting',
                component: ComponentCreator('/docs/troubleshooting', 'e02'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
