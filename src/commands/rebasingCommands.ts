import { MenuState, MenuUtil } from '../menu/menu';
import { MagitRepository } from '../models/magitRepository';
import { gitRun } from '../utils/gitRawRunner';
import MagitUtils from '../utils/magitUtils';
import { MagitError } from '../models/magitError';
import * as CommitCommands from '../commands/commitCommands';
import { commands } from 'vscode';

const whileRebasingMenu = {
  title: 'Rebasing',
  commands: [
    { label: 'r', description: 'Continue', action: (state: MenuState) => rebaseControlCommand(state, '--continue') },
    { label: 's', description: 'Skip', action: (state: MenuState) => rebaseControlCommand(state, '--skip') },
    // { label: 'e', description: 'Edit', action: (state: MenuState) => rebaseControlCommand(state, '--edit-todo') },
    { label: 'a', description: 'Abort', action: (state: MenuState) => rebaseControlCommand(state, '--abort') }
  ]
};

export async function rebasing(repository: MagitRepository) {

  if (repository.magitState?.rebasingState) {
    return MenuUtil.showMenu(whileRebasingMenu, { repository });
  } else {

    const HEAD = repository.magitState?.HEAD;

    const commands = [];

    if (HEAD?.pushRemote) {
      commands.push({ label: 'p', description: `onto ${HEAD.pushRemote.remote}/${HEAD.pushRemote.name}`, action: rebase });
    }

    if (HEAD?.upstreamRemote) {
      commands.push({ label: 'u', description: `onto ${HEAD.upstreamRemote.remote}/${HEAD.upstreamRemote.name}`, action: rebase });
    }

    commands.push(...[
      { label: 'e', description: `onto elsewhere`, action: rebase },
      { label: 'i', description: `interactively`, action: rebaseInteractively }
    ]);

    const rebasingMenu = {
      title: `Rebasing ${HEAD?.name}`,
      commands
    };

    return MenuUtil.showMenu(rebasingMenu, { repository });
  }
}

async function rebase({ repository }: MenuState) {
  const ref = await MagitUtils.chooseRef(repository, 'Rebase');

  if (ref) {
    return _rebase(repository, ref);
  }
}

async function _rebase(repository: MagitRepository, ref: string) {

  const args = ['rebase', ref];

  try {
    return await gitRun(repository, args);
  }
  catch (e) {
    throw new MagitError('Failed to merge in the changes.', e);
  }
}

async function rebaseControlCommand({ repository }: MenuState, command: string) {
  const args = ['rebase', command];
  return gitRun(repository, args);
}

async function rebaseInteractively({ repository }: MenuState) {
  const ref = await MagitUtils.chooseRef(repository, 'Rebase');

  if (ref) {
    const args = ['rebase', '--interactive', ref];

    return CommitCommands.runCommitLikeCommand(repository, args, { editor: 'GIT_SEQUENCE_EDITOR' });
  }
}

export async function abortInteractiveRebase(repository: MagitRepository) {
  await commands.executeCommand('magit.clear-and-abort-editor');
  return rebaseControlCommand({ repository }, '--abort');
}