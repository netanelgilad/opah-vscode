import { dirname, resolve } from 'path';
import { resolve as urlResolve } from 'url';

export function resolveURIFromDependency(
  dependencyPath: string,
  currentURI: string
) {
  return dependencyPath.startsWith('http://')
    ? dependencyPath
    : dependencyPath.startsWith('.')
    ? currentURI.startsWith('/')
      ? resolve(dirname(currentURI), dependencyPath)
      : urlResolve(currentURI, dependencyPath)
    : dependencyPath;
}
