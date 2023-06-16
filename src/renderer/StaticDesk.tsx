import { VscSplitHorizontal, VscSplitVertical } from 'react-icons/vsc';
import icon from '../../assets/icon.svg';
import './Reset.css';
import './App.css';

function Actions() {
  return (
    <div className="Actions">
      <nav>
        <ul>
          <li>
            <VscSplitHorizontal />
          </li>
          <li>
            <VscSplitVertical />
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default function StaticDesk() {
  // Demo (TODO load from configuration file)
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

  console.log(desk);

  return (
    <div className="Desk">
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <div className="Grid">
        <Actions />
        <div className="HorizontalPane">
          <Actions />
          <div className="VerticalPane">
            <Actions />
            <div className="Container" style={{ height: '75%' }}>
              <Actions />
              <div className="Note">Note 1</div>
              <div className="Note">Note 2</div>
              <div className="Note">Note 3</div>
            </div>
            <div className="Container">
              <Actions />
              <div className="Note">Note 1</div>
              <div className="Note">Note 2</div>
            </div>
          </div>
          <div className="VerticalPane">
            <Actions />
            <div className="Container">
              <Actions />
              <div className="Note">Note 1</div>
              <div className="Note">Note 2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
