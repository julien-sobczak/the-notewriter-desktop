// The NoteWriter Desktop
// Main configuration file
// ~/.nt/editorconfig.jsonnet (in complement to ~/.nt/config.json for saved searches, etc.)

// List of repositories (= The NoteWriter repositories)
// Useful when splitting work and life notes in different Git repositories while keeping the option to search across all repositories of notes using the desktop application.
// (Ex: You can keep Go cheatsheets inside your main collection as they can be useful if you change work and still want to search them at work)
{
  repositories: [
    {
      name: 'Main',
      slug: 'main',  // Useful to reference in desks
      path: '~/notes',
      selected: true,  // Selected by default
    },
    {
      name: 'My Company',
      slug: 'my-company',
      path: '~/Workspace/notes',
    },
  ],

  dailyQuote: {
    query: 'path:references @type:quote',
    repositories: ['main'],
  },

  // "Get inspired by" action
  inspirations: [
    // Default can be:
    // {
    //   name: 'Quotes',
    //   repositories: 'all',  // or specify repository slugs
    //   query: '@type:quote',
    // },
    // {
    //   name: 'Art',
    //   repositories: 'all',
    //   query: '@type:artwork',
    // },
    {
      name: 'Life',
      repositories: ['main'],
      query: 'path:references/persons (#life or #purpose) @type:quote',
    },
    {
      name: 'Art',
      repositories: ['main'],
      query: 'path:references @type:artwork',
    },
    // Complete with more inspirations
  ],

  // Planner configuration
  planner: {
    projects: [
      {
        name: 'Side Projects',
        query: 'path:projects @type:Synopsis',
        repositories: ['main'],
      },
    ],
    tasks: [
      {
        name: 'Personal Backlog',
        query: 'path:projects/ @type:Todo',
        repositories: ['main'],
      },
    ],
  },

  // List of desks
  // (probably in a `~/.nt/editorconfig.json` file to be saved easily from the code without losing comments, formatting)
  // The NoteWriter Desktop must load this file at startup and support a save button to persist changes in desks or new desks (like VS Code supports editing the configuration).
  desks: [
    {
      name: 'My Project',
      repository: 'main',
      layout: 'horizontal',  // vertical | horizontal | container (default)
      elements: [
        {
          width: '70%',  // or just "size"? Accept only percent?
          query: 'path:projects/my-project (kind:note)',
        },
        {
          layout: 'vertical',
          elements: [
            {
              query: 'path:projects/my-project kind:todo title:Backlog',
              view: 'single',  // single | grid (default) | list
              height: '30%',
            },
            {
              query: 'path:projects/my-project (kind:reference or kind:quote)',
            },
          ],
        },
      ],
    },
  ],
}
