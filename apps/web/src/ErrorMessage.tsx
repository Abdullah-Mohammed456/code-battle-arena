export function ErrorMessage({ error }: { error: unknown }) {
  return (
    <p className="error-message" role="alert">
      {error instanceof Error
        ? error.message
        : "Something went wrong — please try again"}
    </p>
  );
}
