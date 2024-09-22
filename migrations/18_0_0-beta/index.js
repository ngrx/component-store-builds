"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTapResponseImport = migrateTapResponseImport;
exports.default = default_1;
var ts = require("typescript");
var schematics_1 = require("@angular-devkit/schematics");
var schematics_core_1 = require("../../schematics-core");
var change_1 = require("../../schematics-core/utility/change");
function migrateTapResponseImport() {
    return function (tree, ctx) {
        (0, schematics_core_1.addPackageToPackageJson)(tree, 'dependencies', '@ngrx/operators', '^18.0.0');
        (0, schematics_core_1.visitTSSourceFiles)(tree, function (sourceFile) {
            var _a;
            var importDeclarations = new Array();
            getImportDeclarations(sourceFile, importDeclarations);
            var componentStoreImportsAndDeclarations = importDeclarations
                .map(function (componentStoreImportDeclaration) {
                var componentStoreImports = getComponentStoreNamedBinding(componentStoreImportDeclaration);
                if (componentStoreImports) {
                    if (componentStoreImports.elements.some(function (element) { return element.name.getText() === 'tapResponse'; })) {
                        return { componentStoreImports: componentStoreImports, componentStoreImportDeclaration: componentStoreImportDeclaration };
                    }
                    return undefined;
                }
                else {
                    return undefined;
                }
            })
                .filter(Boolean);
            if (componentStoreImportsAndDeclarations.length === 0) {
                return;
            }
            else if (componentStoreImportsAndDeclarations.length > 1) {
                ctx.logger.info('[@ngrx/component-store] Skipping because of multiple `tapResponse` imports');
                return;
            }
            var _b = __read(componentStoreImportsAndDeclarations, 1), componentStoreImportsAndDeclaration = _b[0];
            if (!componentStoreImportsAndDeclaration) {
                return;
            }
            var componentStoreImports = componentStoreImportsAndDeclaration.componentStoreImports, componentStoreImportDeclaration = componentStoreImportsAndDeclaration.componentStoreImportDeclaration;
            var operatorsImportDeclaration = importDeclarations.find(function (node) {
                return node.moduleSpecifier.getText().includes('@ngrx/operators');
            });
            var otherComponentStoreImports = componentStoreImports.elements
                .filter(function (element) { return element.name.getText() !== 'tapResponse'; })
                .map(function (element) { return element.name.getText(); })
                .join(', ');
            var changes = [];
            // Remove `tapResponse` from @ngrx/component-store and leave the other imports
            if (otherComponentStoreImports) {
                changes.push((0, schematics_core_1.createReplaceChange)(sourceFile, componentStoreImportDeclaration, componentStoreImportDeclaration.getText(), "import { ".concat(otherComponentStoreImports, " } from '@ngrx/component-store';")));
            }
            // Remove complete @ngrx/component-store import because it contains only `tapResponse`
            else {
                changes.push((0, change_1.createRemoveChange)(sourceFile, componentStoreImportDeclaration, componentStoreImportDeclaration.getStart(), componentStoreImportDeclaration.getEnd() + 1));
            }
            var importAppendedInExistingDeclaration = false;
            if ((_a = operatorsImportDeclaration === null || operatorsImportDeclaration === void 0 ? void 0 : operatorsImportDeclaration.importClause) === null || _a === void 0 ? void 0 : _a.namedBindings) {
                var bindings = operatorsImportDeclaration.importClause.namedBindings;
                if (ts.isNamedImports(bindings)) {
                    // Add import to existing @ngrx/operators
                    var updatedImports = __spreadArray(__spreadArray([], __read(bindings.elements.map(function (element) { return element.name.getText(); })), false), [
                        'tapResponse',
                    ], false);
                    var newOperatorsImport = "import { ".concat(updatedImports.join(', '), " } from '@ngrx/operators';");
                    changes.push((0, schematics_core_1.createReplaceChange)(sourceFile, operatorsImportDeclaration, operatorsImportDeclaration.getText(), newOperatorsImport));
                    importAppendedInExistingDeclaration = true;
                }
            }
            if (!importAppendedInExistingDeclaration) {
                // Add new @ngrx/operators import line
                var newOperatorsImport = "import { tapResponse } from '@ngrx/operators';";
                changes.push(new schematics_core_1.InsertChange(sourceFile.fileName, componentStoreImportDeclaration.getEnd() + 1, "".concat(newOperatorsImport, "\n") // not os-independent for snapshot tests
                ));
            }
            (0, schematics_core_1.commitChanges)(tree, sourceFile.fileName, changes);
            if (changes.length) {
                ctx.logger.info("[@ngrx/component-store] Updated tapResponse to import from '@ngrx/operators'");
            }
        });
    };
}
function getImportDeclarations(node, imports) {
    if (ts.isImportDeclaration(node)) {
        imports.push(node);
    }
    ts.forEachChild(node, function (childNode) {
        return getImportDeclarations(childNode, imports);
    });
}
function getComponentStoreNamedBinding(node) {
    var _a;
    var namedBindings = (_a = node === null || node === void 0 ? void 0 : node.importClause) === null || _a === void 0 ? void 0 : _a.namedBindings;
    if (node.moduleSpecifier.getText().includes('@ngrx/component-store') &&
        namedBindings &&
        ts.isNamedImports(namedBindings)) {
        return namedBindings;
    }
    return null;
}
function default_1() {
    return (0, schematics_1.chain)([migrateTapResponseImport()]);
}
//# sourceMappingURL=index.js.map