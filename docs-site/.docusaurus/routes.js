import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/search',
    component: ComponentCreator('/search', '822'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/', '76c'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '918'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '1ef'),
            routes: [
              {
                path: '/architecture/data-flow',
                component: ComponentCreator('/architecture/data-flow', '250'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture/modules',
                component: ComponentCreator('/architecture/modules', '282'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/architecture/overview',
                component: ComponentCreator('/architecture/overview', 'f3c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/core-concepts/glossary',
                component: ComponentCreator('/core-concepts/glossary', '0ae'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/core-concepts/payroll-jar',
                component: ComponentCreator('/core-concepts/payroll-jar', '116'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/core-concepts/privacy-layer',
                component: ComponentCreator('/core-concepts/privacy-layer', '464'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/core-concepts/yield-generation',
                component: ComponentCreator('/core-concepts/yield-generation', '255'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/faq',
                component: ComponentCreator('/faq', '7f4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/getting-started',
                component: ComponentCreator('/getting-started', 'ac2'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/installation',
                component: ComponentCreator('/installation', '5f3'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/reference/program',
                component: ComponentCreator('/reference/program', '3cd'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/reference/typescript-client',
                component: ComponentCreator('/reference/typescript-client', 'b75'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/security',
                component: ComponentCreator('/security', 'fba'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/troubleshooting',
                component: ComponentCreator('/troubleshooting', 'ab5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/usage-basics',
                component: ComponentCreator('/usage-basics', 'fd4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/',
                component: ComponentCreator('/', '7da'),
                exact: true,
                sidebar: "docs"
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
