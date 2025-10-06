local nt = import 'nt.libsonnet';

local srsAlgorithmSettings = {
    easeFactor: 2.5,
};

{
    attributes: nt.DefaultAttributes,
    noteTypes: nt.DefaultNoteTypes + {
        BookReview: nt.DefaultNoteTypes.Note + {
            name: "BookReview",
            hooks: ["blog_review"],
        },
        Feature: nt.DefaultNoteTypes.Task + {
          name: "Feature",
        },
    },

    searches: {
        favoriteQuotes: {
            title: "Favorite Quotes",
            q: "-#ignore @object:quote",
        },
    },

    decks: [
        {
            name: "Programming",
            query: "path:skills/programming",
            newFlashcardsPerDay: 10,
            algorithmSettings: srsAlgorithmSettings,
        },
        {
            name: "Learning",
            query: "path:skills/learning",
            newFlashcardsPerDay: 10,
            algorithmSettings: srsAlgorithmSettings,
        },
    ]

}
