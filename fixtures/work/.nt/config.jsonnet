local nt = import 'nt.libsonnet';

local srsAlgorithmSettings = {
    easeFactor: 2.5,
};

{
    attributes: nt.DefaultAttributes,
    noteTypes: nt.DefaultNoteTypes,
    fileTypes: nt.DefaultFileTypes,

    decks: [
        {
            name: "Work",
            query: "path:skills",
            newFlashcardsPerDay: 10,
            algorithmSettings: srsAlgorithmSettings,
        }
    ]

}
