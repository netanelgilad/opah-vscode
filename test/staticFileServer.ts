import { createServer } from 'http';

export async function* staticFileServer(urlToContents: {
  [url: string]: string;
}) {
  const httpServer = createServer((req, res) => {
    const contents = urlToContents[req.url!];
    res.write(contents);
    res.end();
  });

  await new Promise(resolve => {
    httpServer.listen(resolve);
  });

  yield () => {
    httpServer.close();
  };

  return httpServer.address();
}
