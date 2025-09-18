/* eslint-disable react/no-array-index-key */
import React, { useState, useMemo, useContext } from 'react';
import classNames from 'classnames';
import {
  ConfigContext,
  determineShortAttributeLabel,
  determineLongAttributeLabel,
  getSelectedRepositorySlugs,
} from './ConfigContext';

export interface KanbanColumn {
  title: string;
  statuses: string[];
}

export interface KanbanItem {
  // Repository containing the item
  repositorySlug: string;
  // Group items by this field (ex: project name)
  group: string;
  description: string;
  // Status determine the column
  status: string;
  // Reference to the original note
  noteOID: string;
  noteLine: number;
}

interface KanbanRenderedColumnProps {
  column: KanbanColumn;
  items: KanbanItem[];
  renderItem: (item: KanbanItem) => React.ReactNode;
}

function KanbanRenderedColumn({
  column,
  items,
  renderItem,
}: KanbanRenderedColumnProps) {
  const { config } = useContext(ConfigContext);
  const repositoryConfigs = config.repositories;

  // State to track which statuses are selected (enabled) for this column
  // Hide 'archived' and 'done' by default
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(() => {
    const hiddenStatuses = ['archived', 'done'];
    return new Set(
      column.statuses.filter(
        (status) => !hiddenStatuses.includes(status.toLowerCase()),
      ),
    );
  });

  // Toggle status filter for this column
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

  // Filter items by selected statuses for this column
  const filteredItems = items.filter(
    (item) => item.status && selectedStatuses.has(item.status),
  );

  // The attribute 'status' is standard. Use the definition from the first repository found.
  const selectedRepositorySlugs = getSelectedRepositorySlugs(config.static);
  if (selectedRepositorySlugs.length === 0) return null;

  const defaultRepositoryConfig = repositoryConfigs[selectedRepositorySlugs[0]];

  // Sort items by the order of statuses in the column
  const sortedItems = filteredItems.sort((a, b) => {
    const aIndex = column.statuses.indexOf(a.status || '');
    const bIndex = column.statuses.indexOf(b.status || '');
    return aIndex - bIndex;
  });

  return (
    <div className="KanbanColumn">
      <h2 className="ColumnTitle">{column.title}</h2>

      {/* Status filter for this column */}
      <div className="KanbanFilter">
        <ul className="Filter">
          {column.statuses.map((status) => (
            <li
              key={status}
              className={classNames({
                selected: selectedStatuses.has(status),
              })}
              onClick={() => toggleStatus(status)}
            >
              {determineLongAttributeLabel(
                defaultRepositoryConfig,
                'status',
                status,
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="ColumnItems">
        {sortedItems.map((item, index) => {
          return (
            <div key={`${column.title}-item-${index}`} className="KanbanItem">
              <header>
                <span className="KanbanItemStatus">
                  {determineShortAttributeLabel(
                    defaultRepositoryConfig,
                    'status',
                    item.status,
                  )}
                </span>
                &nbsp;
                <span className="KanbanItemGroup">{item.group}</span>
              </header>
              <div>{renderItem(item)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  items: KanbanItem[];
  renderItem: (item: KanbanItem) => React.ReactNode;
}

function KanbanBoard({ columns, items, renderItem }: KanbanBoardProps) {
  // Get all unique groups, sorted alphabetically
  const allGroups = useMemo(() => {
    const groups = [...new Set(items.map((item) => item.group))];
    return groups.sort();
  }, [items]);

  // State to track which groups are selected (enabled)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    new Set(allGroups),
  );

  // Toggle group filter
  const toggleGroup = (group: string) => {
    setSelectedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  };

  // Filter items by selected groups
  const filteredItemsByGroup = items.filter((item) =>
    selectedGroups.has(item.group),
  );

  // Group items by column
  const getItemsForColumn = (column: KanbanColumn) => {
    return filteredItemsByGroup.filter(
      (item) => item.status && column.statuses.includes(item.status),
    );
  };

  return (
    <div className="KanbanBoard">
      {/* Global group filter */}
      <div className="KanbanFilter">
        <ul className="Filter">
          {allGroups.map((group) => (
            <li
              key={group}
              className={classNames({
                selected: selectedGroups.has(group),
              })}
              onClick={() => toggleGroup(group)}
            >
              {group}
            </li>
          ))}
        </ul>
      </div>

      {/* Kanban columns */}
      <div className="KanbanColumns">
        {columns.map((column) => (
          <KanbanRenderedColumn
            key={column.title}
            column={column}
            items={getItemsForColumn(column)}
            renderItem={renderItem}
          />
        ))}
      </div>
    </div>
  );
}

export default KanbanBoard;
