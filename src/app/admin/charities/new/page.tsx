import { CharityForm } from "../charity-form";

export default function NewCharityPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">New charity</h1>
        <p className="text-ink-600 mt-1">Add a new cause to the directory.</p>
      </header>
      <CharityForm />
    </div>
  );
}
