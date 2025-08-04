import {
  EditorDynamicConfig,
  EditorStaticConfig,
  RepositoryConfig,
  Desk,
  Bookmark,
} from '../shared/Model';

export type Config = {
  static: EditorStaticConfig;
  dynamic: EditorDynamicConfig;
  repositories: { [key: string]: RepositoryConfig };
};

export type Action = {
  type: string;
  payload: any;
};

export default function configReducer(draft: Config, action: Action): any {
  console.log('dispatch', action);
  switch (action.type) {
    case 'init': {
      draft.static = action.payload.static;
      draft.dynamic = action.payload.dynamic;
      draft.repositories = action.payload.repositories;
      break;
    }
    case 'toggleRepositorySelected': {
      for (const repository of draft.static.repositories) {
        if (repository.slug === action.payload) {
          repository.selected = !repository.selected;
        }
      }
      break;
    }
    case 'add-desk': {
      if (!draft.dynamic.desks) draft.dynamic.desks = [];
      draft.dynamic.desks.push(action.payload as Desk);
      break;
    }
    case 'edit-desk': {
      if (!draft.dynamic.desks) draft.dynamic.desks = [];
      const index = draft.dynamic.desks.findIndex(
        (d: Desk) => d.id === action.payload.id,
      );
      draft.dynamic.desks[index] = action.payload;
      break;
    }
    case 'delete-desk': {
      if (!draft.dynamic.desks) draft.dynamic.desks = [];
      return draft.dynamic.desks.filter(
        (d: Desk) => d.id !== action.payload.id,
      );
    }
    case 'add-bookmark': {
      if (!draft.dynamic.bookmarks) draft.dynamic.bookmarks = [];
      draft.dynamic.bookmarks.push(action.payload as Bookmark);
      break;
    }
    default: {
      throw Error(`Unknown action: ${action.type}`);
    }
  }
  return draft;
}
