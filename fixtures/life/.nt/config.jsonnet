local nt = import 'nt.libsonnet';

local srsAlgorithmSettings = {
    easeFactor: 2.5,
};

{
    Types: nt.DefaultTypes,

    Searches: {
        favoriteQuotes: {
            title: "Favorite Quotes",
            q: "-#ignore @object:quote",
        },
    },

    Decks: [
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
