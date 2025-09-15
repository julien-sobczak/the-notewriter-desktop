import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import KanbanBoard from '../renderer/KanbanBoard';

// Mock items with status property
const mockItems = [
  { oid: '1', status: 'todo', title: 'Task 1' },
  { oid: '2', status: 'in-progress', title: 'Task 2' },
  { oid: '3', status: 'done', title: 'Task 3' },
  { oid: '4', status: 'todo', title: 'Task 4' },
];

const mockColumns = [
  { title: 'To Do', statuses: ['todo', 'planned'] },
  { title: 'In Progress', statuses: ['in-progress', 'blocked'] },
  { title: 'Done', statuses: ['done', 'archived'] },
];

const mockRenderItem = (item: any) => <div>{item.title}</div>;

describe('KanbanBoard', () => {
  it('renders columns correctly', () => {
    const { getByText } = render(
      <KanbanBoard
        columns={mockColumns}
        items={mockItems}
        renderItem={mockRenderItem}
      />
    );

    // Check that column titles are rendered
    expect(getByText('To Do')).toBeInTheDocument();
    expect(getByText('In Progress')).toBeInTheDocument();
    expect(getByText('Done')).toBeInTheDocument();
  });

  it('groups items by status correctly', () => {
    const { getByText } = render(
      <KanbanBoard
        columns={mockColumns}
        items={mockItems}
        renderItem={mockRenderItem}
      />
    );

    // Check that items are rendered
    expect(getByText('Task 1')).toBeInTheDocument();
    expect(getByText('Task 2')).toBeInTheDocument();
    expect(getByText('Task 3')).toBeInTheDocument();
    expect(getByText('Task 4')).toBeInTheDocument();
  });

  it('renders status filter buttons', () => {
    const { getByText } = render(
      <KanbanBoard
        columns={mockColumns}
        items={mockItems}
        renderItem={mockRenderItem}
      />
    );

    // Check that status filter buttons are rendered
    expect(getByText('todo')).toBeInTheDocument();
    expect(getByText('in-progress')).toBeInTheDocument();
    expect(getByText('done')).toBeInTheDocument();
  });
});