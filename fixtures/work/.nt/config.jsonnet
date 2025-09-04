local nt = import 'nt.libsonnet';

local srsAlgorithmSettings = {
    easeFactor: 2.5,
};

{
    attributes: nt.DefaultAttributes,
    types: nt.DefaultTypes,

    decks: [
        {
            name: "Work",
            query: "path:skills",
            newFlashcardsPerDay: 10,
            algorithmSettings: srsAlgorithmSettings,
        }
    ]

}
