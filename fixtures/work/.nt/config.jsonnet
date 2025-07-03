local nt = import 'nt.libsonnet';

local srsAlgorithmSettings = {
    easeFactor: 2.5,
};

{
    Types: nt.DefaultTypes,

    Decks: [
        {
            name: "Work",
            query: "path:skills",
            newFlashcardsPerDay: 10,
            algorithmSettings: srsAlgorithmSettings,
        }
    ]

}
