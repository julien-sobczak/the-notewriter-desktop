import React, { useState } from 'react';
import classNames from 'classnames';

interface KanbanColumn {
  title: string;
  statuses: string[];
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn[];
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function KanbanBoard<T extends { status?: string; oid?: string }>({
  columns,
  items,
  renderItem,
}: KanbanBoardProps<T>) {
  // Get all unique statuses from all columns in order
  const allStatuses = columns.flatMap((column) => column.statuses);

  // State to track which statuses are selected (enabled)
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(allStatuses),
  );

  // Toggle status filter
  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  // Filter items by selected statuses
  const filteredItems = items.filter(
    (item) => !item.status || selectedStatuses.has(item.status),
  );

  // Group items by status for each column
  const getItemsForColumn = (column: KanbanColumn) => {
    const columnItems = filteredItems.filter(
      (item) => item.status && column.statuses.includes(item.status),
    );

    // Sort items by the order of statuses in the column
    return columnItems.sort((a, b) => {
      const aIndex = column.statuses.indexOf(a.status || '');
      const bIndex = column.statuses.indexOf(b.status || '');
      return aIndex - bIndex;
    });
  };

  return (
    <div className="KanbanBoard">
      {/* Status filter */}
      <div className="StatusFilter">
        <h3>Filter by status:</h3>
        <div className="StatusButtons">
          {allStatuses.map((status) => (
            <button
              key={status}
              type="button"
              className={classNames('StatusButton', {
                selected: selectedStatuses.has(status),
              })}
              onClick={() => toggleStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="KanbanColumns">
        {columns.map((column) => {
          const columnItems = getItemsForColumn(column);
          return (
            <div key={column.title} className="KanbanColumn">
              <h2 className="ColumnTitle">{column.title}</h2>
              <div className="ColumnItems">
                {columnItems.map((item, index) => {
                  return (
                    <div key={`${column.title}-item-${index}`} className="KanbanItem">
                      {renderItem(item)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KanbanBoard;
