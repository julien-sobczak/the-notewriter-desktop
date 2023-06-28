# Notebook

## Draft Components

```javascript
<Note value={note} mediaMode={"preview|large|original"} showAttributes={true} showTags={true} excerpt={true} /> {/* show buttons? */}

<NoteContainer elements={notes}>
{/* Iterate over notes to generate <Note value={element} mediaMode="preview" showAttributes={false} showTags={false} excerpt={true} /> */}

<ZenMode>
{/* Randomly display notes <Note value={note} mediaMode="large" showAttributes={false} showTags={false} excerpt={false} /> */}

function Desk({name, template={}}) {
  return (
    <VerticalPane id="block1"
        onRemove={(event) => removeBlock(event.target.id)}
        onVerticalSplit={(event) => splitVertically(event.target.id)}
        onHorizontalSplit={(event) => splitHorizontally(event.target.id)}
        onResize={(event, sizePercent) => resize(event.target.id, sizePercent)}
    >
      <HorizontalPane id="block2">
        <NoteContainer id="block3" notes={notes3}>
        <NoteContainer id="block4" notes={notes4}>
      </HorizontalPane>
      <NoteContainer id="block5" notes={notes5}
        onSearch={(query) => search(query)}
        onRemove={(event) => removeBlock(event.target.id)}
        onRemoveNote={(event, oid) => removeNote(event.target.id, oid)}
        onChangeView={(event, viewMode) => changeView(event.target.id, viewMode)}
      />
    </VerticalPane>
  );
}

const desk = {
  name: 'My Project',
  workspace: 'main',
  root: {
    layout: 'horizontal',
    elements: [
      {
        layout: 'container',
        width: '70%',
        query: 'path:projects/my-project (kind:note)',
      },
      {
        layout: 'vertical',
        elements: [
          {
            layout: 'container',
            query: 'path:projects/my-project kind:todo title:Backlog',
            view: 'single',
            height: '30%',
          },
          {
            layout: 'container',
            query: 'path:projects/my-project (kind:reference or kind:quote)',
          },
        ],
      },
    ],
  },
};

// Step 0: Duplicate the template to insert random id to each block (useful in following steps)
// Step 1: Iterate over the template to trigger the search of notes (use a map with blockid=>loaded to show results progressively)
// Step 2: Iterate over the template to build the HTML using <VerticalPane>, <HorizontalPane> and <NoteContainer>
```

## Draft Workspace

```jsx
<Workspace>
  searchResults // Side panel to quickly find notes even when working on a desk
  notesCache<string, Note[]> // by block ID
  useRef(layouts<string, Block>) // by desk ID
  
  <Desk notesCache={notesCache} desk={desk} onLayoutChange={onLayoutChange} />
    send('multi-search') // or send('search')
    onSave => onLayoutChange(desk.root)


```


