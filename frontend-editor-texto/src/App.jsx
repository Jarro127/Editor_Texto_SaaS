import Editor from "./components/Editor";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Editor de Texto SaaS</h1>
        <p>Mi primer editor construido con React</p>
      </header>
      <main>
        <Editor />
      </main>
    </div>
  );
}

export default App;
