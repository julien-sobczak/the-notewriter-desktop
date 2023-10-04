import { EditorDynamicConfig, EditorStaticConfig, Desk } from 'shared/Model';

export type Config = {
  static: EditorStaticConfig;
  dynamic: EditorDynamicConfig;
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
      break;
    }
    case 'toggleWorkspaceSelected': {
      for (const workspace of draft.static.workspaces) {
        if (workspace.slug === action.payload) {
          workspace.selected = !workspace.selected;
        }
      }
      break;
    }
    case 'add-desk': {
      draft.dynamic.desks.push(action.payload as Desk);
      break;
    }
    case 'edit-desk': {
      const index = draft.dynamic.desks.findIndex(
        (d: Desk) => d.id === action.payload.id
      );
      draft.dynamic.desks[index] = action.payload;
      break;
    }
    case 'delete-desk': {
      return draft.dynamic.desks.filter(
        (d: Desk) => d.id !== action.payload.id
      );
    }
    default: {
      throw Error(`Unknown action: ${action.type}`);
    }
  }
  return draft;
}
