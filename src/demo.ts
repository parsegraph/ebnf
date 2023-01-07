import Navport, { render } from "parsegraph-viewport";
import {BlockNode} from 'parsegraph-block';
import EBNF from './EBNF';

document.addEventListener("DOMContentLoaded", () => {
  console.log("Running demo");
  const topElem = document.getElementById("demo");
  topElem.style.position = "relative";
  const viewport = new Navport(null);
  const ebnf = new EBNF(viewport);
  ebnf.setOnScheduleUpdate(()=>viewport.scheduleRepaint());

  fetch("/ebnf.grammar").then(async (resp:any)=>{
    const data = await resp.text();
    ebnf.setText(data);
    viewport.setRoot(ebnf.root());
  });

  viewport.setRoot(new BlockNode("b"));
  render(topElem, viewport);
});
