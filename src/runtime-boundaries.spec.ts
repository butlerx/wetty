import 'mocha';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { expect } from 'chai';
import ts from 'typescript';

interface SourceImport {
  runtime: boolean;
  specifier: string;
}

const sourceRoot = resolve('src');
const clientRoot = resolve(sourceRoot, 'client');
const protocolRoot = resolve(sourceRoot, 'protocol');
const serverRoot = resolve(sourceRoot, 'server');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
      ? [path]
      : [];
  });
}

const productionFiles = sourceFiles(sourceRoot);
const productionFileSet = new Set(productionFiles);

function sourceImports(path: string): SourceImport[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const imports: SourceImport[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const clause = node.importClause;
      const namedBindings = clause?.namedBindings;
      const typeOnlyNamedImports =
        namedBindings !== undefined &&
        ts.isNamedImports(namedBindings) &&
        namedBindings.elements.every((element) => element.isTypeOnly);
      imports.push({
        runtime:
          clause === undefined ||
          (clause.phaseModifier !== ts.SyntaxKind.TypeKeyword &&
            (clause.name !== undefined || !typeOnlyNamedImports)),
        specifier: node.moduleSpecifier.text,
      });
    }

    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({
        runtime: !node.isTypeOnly,
        specifier: node.moduleSpecifier.text,
      });
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push({ runtime: true, specifier: node.arguments[0].text });
    }

    ts.forEachChild(node, visit);
  }

  visit(source);

  return imports;
}

function resolveSourceImport(
  importer: string,
  specifier: string,
): string | undefined {
  if (!specifier.startsWith('.')) return undefined;

  const sourcePath = specifier.endsWith('.js')
    ? `${specifier.slice(0, -3)}.ts`
    : `${specifier}.ts`;
  const candidate = resolve(dirname(importer), sourcePath);
  if (productionFileSet.has(candidate)) return candidate;

  const indexCandidate = resolve(dirname(importer), specifier, 'index.ts');
  return productionFileSet.has(indexCandidate) ? indexCandidate : undefined;
}

const importsByFile = new Map(
  productionFiles.map((path) => [path, sourceImports(path)]),
);

function resolvedImports(path: string, runtimeOnly = false): string[] {
  return (importsByFile.get(path) ?? [])
    .filter((sourceImport) => !runtimeOnly || sourceImport.runtime)
    .map((sourceImport) => resolveSourceImport(path, sourceImport.specifier))
    .filter((target): target is string => target !== undefined);
}

function transitiveImports(path: string): string[] {
  const reached = new Set<string>();
  const pending = [...resolvedImports(path)];
  while (pending.length > 0) {
    const target = pending.pop();
    if (target !== undefined && !reached.has(target)) {
      reached.add(target);
      pending.push(...resolvedImports(target));
    }
  }
  reached.delete(path);
  return [...reached];
}

function pathWithin(path: string, directory: string): boolean {
  return path === directory || path.startsWith(`${directory}${sep}`);
}

function displayPath(path: string): string {
  return relative(sourceRoot, path);
}

function runtimeCycle(): string[] | undefined {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const stack: string[] = [];

  function visit(path: string): string[] | undefined {
    visiting.add(path);
    stack.push(path);

    for (const target of resolvedImports(path, true)) {
      if (visiting.has(target)) {
        return [...stack.slice(stack.indexOf(target)), target];
      }
      if (!visited.has(target)) {
        const cycle = visit(target);
        if (cycle !== undefined) return cycle;
      }
    }

    stack.pop();
    visiting.delete(path);
    visited.add(path);
    return undefined;
  }

  for (const path of productionFiles) {
    if (!visited.has(path)) {
      const cycle = visit(path);
      if (cycle !== undefined) return cycle;
    }
  }

  return undefined;
}

describe('runtime ownership boundaries', () => {
  it('keeps server production modules out of generic shared directories', () => {
    expect(existsSync(resolve(sourceRoot, 'shared'))).to.equal(false);
    expect(existsSync(resolve(serverRoot, 'shared'))).to.equal(false);
  });

  it('keeps browser modules free of server entrypoints and features', () => {
    const violations = productionFiles
      .filter((path) => pathWithin(path, clientRoot))
      .flatMap((path) =>
        transitiveImports(path)
          .filter(
            (target) =>
              pathWithin(target, serverRoot) ||
              target === resolve(sourceRoot, 'server.ts') ||
              target === resolve(sourceRoot, 'main.ts'),
          )
          .map((target) => `${displayPath(path)} -> ${displayPath(target)}`),
      );

    expect(violations).to.deep.equal([]);
  });

  it('keeps Node modules free of browser implementation imports', () => {
    const violations = productionFiles
      .filter((path) => !pathWithin(path, clientRoot))
      .flatMap((path) =>
        transitiveImports(path)
          .filter((target) => pathWithin(target, clientRoot))
          .map((target) => `${displayPath(path)} -> ${displayPath(target)}`),
      );

    expect(violations).to.deep.equal([]);
  });

  it('keeps protocol modules runtime-neutral', () => {
    const violations = productionFiles
      .filter((path) => pathWithin(path, protocolRoot))
      .flatMap((path) =>
        transitiveImports(path)
          .filter((target) => !pathWithin(target, protocolRoot))
          .map((target) => `${displayPath(path)} -> ${displayPath(target)}`),
      );

    expect(violations).to.deep.equal([]);
  });

  it('keeps the production runtime import graph cycle-free', () => {
    expect(runtimeCycle()?.map(displayPath)).to.equal(undefined);
  });
});
