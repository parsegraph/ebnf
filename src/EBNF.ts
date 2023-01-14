import { Grammars, IToken } from "ebnf";
import TreeNode, {
  BasicTreeList,
  TreeList,
  BlockTreeNode,
  InlineTreeList,
  WrappingTreeList,
} from "parsegraph-treenode";
import Navport, { Carousel, ActionCarousel } from "parsegraph-viewport";
import { DefaultBlockPalette } from "parsegraph-block";
import { PaintedNode } from "parsegraph-artist";

const EBNF_LITERAL_SYMBOL = Symbol("LiteralNode");
class LiteralNode extends BlockTreeNode {
  _carousel: Carousel;

  constructor(value?: string, carousel?: Carousel) {
    super("u", value);
    this._carousel = carousel;
  }

  type() {
    return EBNF_LITERAL_SYMBOL;
  }

  render() {
    const root = super.render();
    if (this._carousel) {
      const carousel = new ActionCarousel(this._carousel);
      carousel.addAction("Edit", () => {
        alert("Editing this node");
      });
      carousel.install(root);
    }
    return root;
  }
}

class ChoiceNode extends BasicTreeList {
  constructor(nav: Navport, title: string, children?: TreeNode[]) {
    super(
      nav,
      new BlockTreeNode("u", title),
      children,
      new DefaultBlockPalette()
    );
  }
}

class ListNode extends InlineTreeList {
  constructor(nav: Navport, children?: TreeNode[]) {
    super(nav, new BlockTreeNode("s"), children);
  }
}

const EBNF_TITLED_LIST_SYMBOL = Symbol("TitledList");
class TitledListNode extends TreeNode {
  _list: TreeList;

  constructor(nav: Navport, title: TreeNode, children?: TreeNode[]) {
    super(nav);
    this._list = new WrappingTreeList(
      nav,
      title,
      children,
      new DefaultBlockPalette()
    );
    this._list.setOnScheduleUpdate(() => this.invalidate());
  }

  type() {
    return EBNF_TITLED_LIST_SYMBOL;
  }

  tree(): TreeList {
    return this._list;
  }

  render(): PaintedNode {
    return this._list.root();
  }
}

export const EBNF_SYMBOL = Symbol("EBNF");
export default class EBNF extends TreeNode {
  _palette: DefaultBlockPalette;
  _grammar: string;
  _content: string;

  _title: BlockTreeNode;
  _tree: BasicTreeList;
  _useBNF: boolean;

  constructor(nav: Navport) {
    super(nav);
    this._palette = new DefaultBlockPalette();
    this._useBNF = false;
    this._title = new BlockTreeNode();
    this._title.setLabel("EBNF");

    this._tree = new BasicTreeList(nav, this._title, [], this._palette);
  }

  carousel() {
    return this.nav().carousel();
  }

  type() {
    return EBNF_SYMBOL;
  }

  buildNode(child: IToken): TreeNode {
    console.log("Creating node", child);
    if (child.children.length === 0) {
      return new LiteralNode(child.text);
    }
    return this.graphWithNewlines(
      new BasicTreeList(this.nav(), new BlockTreeNode("b", child.type), []),
      child.children
    );
  }

  graphWithNewlines(root: TreeList, list: IToken[]): TreeList {
    list
      .map((child) => this.buildNode(child))
      .forEach((node) => node && root.appendChild(node));
    return root;
  }

  setUseBNF(useBNF: boolean) {
    this._useBNF = useBNF;
  }

  setGrammar(grammar: string) {
    this._grammar = grammar;
    this.invalidate();
  }

  setContent(content: string) {
    this._content = content;
    this.invalidate();
  }

  render() {
    this._tree.clear();
    if (!this._grammar || !this._content) {
      return this._tree.root();
    }
    const parser = new (
      this._useBNF ? Grammars.BNF.Parser : Grammars.W3C.Parser
    )(this._grammar);
    const children = parser.getAST(this._content);
    this.graphWithNewlines(this._tree, children.children);
    return this._tree.root();
  }
}
