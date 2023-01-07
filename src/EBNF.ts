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

const EBNF_CHOICE_SYMBOL = Symbol("ChoiceNode");
class ChoiceNode extends BasicTreeList {
  constructor(nav: Navport, children?: TreeNode[]) {
    super(nav, new BlockTreeNode("u"), children, new DefaultBlockPalette());
  }

  type() {
    return EBNF_CHOICE_SYMBOL;
  }
}

const EBNF_LIST_SYMBOL = Symbol("List");
class ListNode extends InlineTreeList {
  constructor(nav: Navport, children?: TreeNode[]) {
    super(nav, new BlockTreeNode("s"), children);
  }

  type() {
    return EBNF_LIST_SYMBOL;
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
  _text: string;

  _title: BlockTreeNode;
  _tree: BasicTreeList;

  constructor(nav: Navport) {
    super(nav);
    this._palette = new DefaultBlockPalette();
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
    switch (child.type) {
      case "Choice":
        return this.graphWithNewlines(new ChoiceNode(this.nav()), child.children);
      case "SequenceOrDifference":
        return this.graphWithNewlines(new ListNode(this.nav()), child.children);
      case "Production":
      case "CharClass":
      case "CharRange":
      case "Item":
      case "SubItem":
        return this.graphWithNewlines(new ListNode(this.nav()), child.children);
      case "PrimaryDecoration":
        return new LiteralNode(child.text);
      case "StringLiteral":
      case "CharCodeRange":
      case "CharCode":
      case "RULE_Char":
      case "NCName":
        return new LiteralNode(child.text);
      default:
        const listNode = new TitledListNode(
          this.nav(),
          new LiteralNode(child.type + " " + child.text)
        );
        this.graphWithNewlines(listNode.tree(), child.children);
        return listNode;
    }
  }

  graphWithNewlines(root: TreeList, list: IToken[]): TreeList {
    list
      .map((child) => this.buildNode(child))
      .forEach((node) => node && root.appendChild(node));
    return root;
  }

  setText(text: string) {
    this._text = text;
    this.invalidate();
  }

  render() {
    this._tree.clear();
    const bnfParser = new Grammars.W3C.Parser(this._text);
    const children = bnfParser.getAST(this._text);
    this.graphWithNewlines(this._tree, children.children);
    return this._tree.root();
  }
}
