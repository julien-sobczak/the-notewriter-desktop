{
  repositories: [
    {
      name: 'Life',
      slug: 'life',
      path: '$PWD/fixtures/life',
    },
    {
      name: 'Work',
      slug: 'work',
      path: '$PWD/fixtures/work',
      selected: false,
    },
  ],

  dailyQuote: {
    query: 'path:references @type:Quote',
    repositories: ['life'],
  },

  inspirations: [
    {
      name: 'Life',
      query: 'path:references/quotes (#life or #life-changing) @type:Quote',
      repositories: ['life'],
    },
    {
      name: 'Art',
      query: 'path:references/art @type:Artwork',
      repositories: ['life'],
    },
  ],

  planner: {
    projects: [
      {
        name: 'Side Projects',
        query: 'path:projects @title:Synopsis',
        repositories: ['work', 'life'],
      },
    ],
    tasks: [
      {
        name: 'Personal Backlog',
        query: 'path:projects/ @type:Todo',
        repositories: ['life'],
      },
    ],
  },

  zenMode: {
    queries: [
      {
        query: 'path:references @type:Quote',
        repositories: ['life'],
      },
      {
        query: 'path:thoughts',
      },
    ],
  },

  journal: [
    {
      name: 'My Diary',
      repository: 'life',
      path: 'journal/${year}/${year}-${month}-${day}.md',
      defaultContent: 'Journal: ${year}-${month}-${day}',
      routines: [
        {
          name: 'Morning Routine',
          template: |||
            # 💪 Affirmation

            <Affirmation wikilink="journaling#List: Affirmations" tags="success,optimism" />

            # ✍️ Morning Pages

            <MorningPages throwAway />

            # 😘 Gratitude Journal

            3 things I appreciate:

            * <Input />
            * <Input />
            * <Input />

            # 🤔 Prompt

            <Prompt wikilink="journaling#List: Prompts" />

            # 🎯 My BIG thing for today

            <Input />
          |||,
        },
        {
          name: 'Shutdown Routine',
          template: |||
            # ❓ How was my day? Why?

            <Input />

            # 📋 3+1 tasks to complete tomorrow:

            * [ ] <Input /> (work)
            * [ ] <Input />
            * [ ] <Input />
            * [ ] <Input />
          |||,
        },
      ],
    },
  ],
}
