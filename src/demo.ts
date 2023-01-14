import Navport, { render } from "parsegraph-viewport";
import { BlockNode } from "parsegraph-block";
import EBNF from "./EBNF";
import Direction, { Alignment, DirectionNode } from "parsegraph-direction";
import { PaintedNode, DOMContent, DOMContentArtist } from "parsegraph-artist";
import TreeNode, { BasicTreeList } from "parsegraph-treenode";
import { BasicProjector } from "parsegraph-projector";

const artist = new DOMContentArtist();
class TextContent extends TreeNode {
  _text: string;
  constructor(nav: Navport, text: string) {
    super(nav);
    this._text = text;
    this._editing = true;
  }

  setText(text: string) {
    this._text = text;
    this.invalidate();
  }

  _editing: boolean;

  text(): string {
    return this._text;
  }

  render(): PaintedNode {
    if (!this._editing) {
      console.log("NOT editign");
      const b = new BlockNode("b");
      b.value().setLabel(this.text());
      return b;
    }
    console.log("Showing editor");
    const node = new DirectionNode();
    const size = 24; // Math.ceil(36 * Math.random());
    const c = document.createElement("textarea");
    c.style.fontFamily = "sans-serif";
    c.style.fontSize = size + "px";
    c.style.pointerEvents = "all";
    c.innerText = this.text();
    c.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this._text = c.textContent;
        console.log(this._text);
        this._editing = false;
        // node.layoutChanged();
        this.invalidate();
        this.nav().scheduleRepaint();
        console.log("ENTER");
      }
    });
    const val = new DOMContent(() => c);
    val.setArtist(artist);
    val.setNode(node);
    val.setOnScheduleUpdate(() => {
      node.layoutChanged();
      // this.invalidate();
      this.nav().scheduleRepaint();
    });
    node.setValue(val);
    return node;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Running demo");
  const topElem = document.getElementById("demo");
  topElem.style.position = "relative";
  const viewport = new Navport(null);
  const ebnf = new EBNF(viewport);
  ebnf.setOnScheduleUpdate(() => viewport.scheduleRepaint());

  const grammar = `
/* https://www.ietf.org/rfc/rfc4627.txt */
value                ::= false | null | true | object | array | number | string
BEGIN_ARRAY          ::= WS* #x5B WS*  /* [ left square bracket */
BEGIN_OBJECT         ::= WS* #x7B WS*  /* { left curly bracket */
END_ARRAY            ::= WS* #x5D WS*  /* ] right square bracket */
END_OBJECT           ::= WS* #x7D WS*  /* } right curly bracket */
NAME_SEPARATOR       ::= WS* #x3A WS*  /* : colon */
VALUE_SEPARATOR      ::= WS* #x2C WS*  /* , comma */
WS                   ::= [#x20#x09#x0A#x0D]+   /* Space | Tab | \\n | \\r */
false                ::= "false"
null                 ::= "null"
true                 ::= "true"
object               ::= BEGIN_OBJECT (member (VALUE_SEPARATOR member)*)? END_OBJECT
member               ::= string NAME_SEPARATOR value
array                ::= BEGIN_ARRAY (value (VALUE_SEPARATOR value)*)? END_ARRAY
number                ::= "-"? ("0" | [1-9] [0-9]*) ("." [0-9]+)? (("e" | "E") ( "-" | "+" )? ("0" | [1-9] [0-9]*))?
/* STRINGS */
string                ::= '"' (([#x20-#x21] | [#x23-#x5B] | [#x5D-#xFFFF]) | #x5C (#x22 | #x5C | #x2F | #x62 | #x66 | #x6E | #x72 | #x74 | #x75 HEXDIG HEXDIG HEXDIG HEXDIG))* '"'
HEXDIG                ::= [a-fA-F0-9]
`;

  /* fetch("/json.grammar").then(async (resp: any) => {
    const grammar = await resp.text();
    ebnf.setGrammar(grammar);
    ebnf.setContent(JSON.stringify({foo:[1,2,"42"]}));
    viewport.setRoot(ebnf.root());
    viewport.scheduleRepaint();
    viewport.showInCamera(ebnf.root());
  });*/

  const list = new BasicTreeList(
    viewport,
    new TextContent(viewport, "BasicTreeList"),
    []
  );

  for (let i = 0; i < 10; ++i) {
    list.appendChild(new TextContent(viewport, "No time " + i));
  }

  const proj = new BasicProjector();
  proj.glProvider();
  proj.overlay();
  viewport.setRoot(list.root());
  list.setOnScheduleUpdate(() => {
    console.log("Scheduling update");
    viewport.setRoot(list.root());
    viewport.scheduleRepaint();
    viewport.showInCamera(null);
  });
  viewport.scheduleRepaint();
  viewport.showInCamera(null);
  render(topElem, viewport, proj);
});
