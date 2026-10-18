import CreateCrawl from "./CreateCrawl";

export default function App() {
  return <CreateCrawl onBuild={(data) => console.log("build crawl", data)} />;
}