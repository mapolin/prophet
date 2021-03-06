/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { HTMLDocument } from '../parser/htmlParser';
import { TokenType, createScanner } from '../parser/htmlScanner';
import { TextDocument, Range, Position, Hover, MarkedString } from 'vscode-languageserver-types';
import { allTagProviders } from './tagProviders';

export function doHover(document: TextDocument, position: Position, htmlDocument: HTMLDocument): Hover | undefined {
	let offset = document.offsetAt(position);
	let node = htmlDocument.findNodeAt(offset);
	if (!node || !node.tag) {
		return void 0;
	}
	let tagProviders = allTagProviders.filter(p => p.isApplicable(document.languageId));
	function getTagHover(tag: string, range: Range, open: boolean): Hover | undefined {
		tag = tag.toLowerCase();
		for (let provider of tagProviders) {
			let hover: Hover | undefined = void 0;
			provider.collectTags((t, label) => {
				if (t === tag) {
					let tagLabel = open ? '<' + tag + '>' : '</' + tag + '>';
					hover = { contents: [ { language: 'html', value: tagLabel }, MarkedString.fromPlainText(label)], range };
				}
			});
			if (hover) {
				return hover;
			}
		}
		return void 0;
	}

	function getTagNameRange(tokenType: TokenType, startOffset: number): Range | undefined {
		let scanner = createScanner(document.getText(), startOffset);
		let token = scanner.scan();
		while (token !== TokenType.EOS && (scanner.getTokenEnd() < offset || scanner.getTokenEnd() === offset && token !== tokenType)) {
			token = scanner.scan();
		}
		if (token === tokenType && offset <= scanner.getTokenEnd()) {
			return { start: document.positionAt(scanner.getTokenOffset()), end: document.positionAt(scanner.getTokenEnd()) };
		}
		return void 0;
	}

	if (node.endTagStart && offset >= node.endTagStart) {
		let tagRange = getTagNameRange(TokenType.EndTag, node.endTagStart);
		if (tagRange) {
			return getTagHover(node.tag, tagRange, false);
		}
		return void 0;
	}

	let tagRange = getTagNameRange(TokenType.StartTag, node.start);
	if (tagRange) {
		return getTagHover(node.tag, tagRange, true);
	}
	return void 0;
}

