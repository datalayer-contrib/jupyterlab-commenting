/**
 * @license BSD-3-Clause
 *
 * Copyright (c) 2019 Project Jupyter Contributors.
 * Distributed under the terms of the 3-Clause BSD License.
 */

import '../style/index.css';

import {
  JupyterFrontEndPlugin,
  ILabShell,
  JupyterFrontEnd
} from '@jupyterlab/application';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { ICommentingServiceConnection } from './comments/service_connection';
import { activateCommentingServiceConnection } from './comments/service_connection';

import { CommentingWidget } from './comments/commenting';
import { CommentingStates } from './comments/states';
import { CommentingDataProvider } from './comments/provider';
import { CommentingDataReceiver } from './comments/receiver';
import { CommentingIndicatorHandler } from './comments/indicator';

/**
 * CommentingUI
 */
export let commentingUI: CommentingWidget;

/**
 * Handles commenting overlay for viewers
 */
export let indicatorHandler: CommentingIndicatorHandler;

/**
 * Data receiver / handler
 */
export let receiver: CommentingDataReceiver;

/**
 * State holder for entire extension
 */
export const states: CommentingStates = new CommentingStates();

/**
 * Data provider
 */
export const provider: CommentingDataProvider = new CommentingDataProvider(
  states
);

/**
 * Activate function for commentingUI
 */
export function activate(
  app: JupyterFrontEnd,
  labShell: ILabShell,
  tracker: IEditorTracker,
  docManager: IDocumentManager,
  browserFactory: IFileBrowserFactory,
  service: ICommentingServiceConnection
) {
  // Create receiver object
  receiver = new CommentingDataReceiver(states, service, docManager);

  // Create CommentingUI React widget
  commentingUI = new CommentingWidget(provider, receiver);
  commentingUI.id = 'jupyterlab-commenting:commentsUI';
  commentingUI.title.iconClass = 'jp-ChatIcon jp-SideBar-tabIcon';
  commentingUI.title.caption = 'Commenting';

  // Add widget to the right area
  labShell.add(commentingUI, 'right');

  // Create CommentingIndicatorHandler
  indicatorHandler = new CommentingIndicatorHandler(
    app,
    provider,
    receiver,
    labShell,
    docManager
  );

  // Tracks active file open
  labShell.currentChanged.connect((sender, args) => {
    const widget = args.newValue;

    if (widget === null) {
      receiver.setTarget(undefined);
      receiver.getAllComments();
    } else {
      const context = docManager.contextForWidget(widget);

      if (!context) {
        receiver.setTarget(undefined);
        receiver.getAllComments();
        return;
      }
      receiver.setTarget(context.path);
      receiver.getAllComments();
    }
  });

  // Called when new data is received from comments service
  receiver.newDataReceived.connect(() => {
    receiver.getAllComments();
  });
}

// creates extension
const commentingExtension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-commenting:commentsUI',
  autoStart: true,
  requires: [
    ILabShell,
    IEditorTracker,
    IDocumentManager,
    IFileBrowserFactory,
    ICommentingServiceConnection
  ],
  activate
};

const commentServiceExtension: JupyterFrontEndPlugin<ICommentingServiceConnection> = {
  id: 'jupyterlab-commenting-service-server',
  autoStart: true,
  requires: [],
  provides: ICommentingServiceConnection,
  activate: activateCommentingServiceConnection
};

const plugins: JupyterFrontEndPlugin<any>[] = [
  commentingExtension,
  commentServiceExtension
];

export default plugins;
