
async function getCompletion(prompt, context, customSystemPrompt) {
  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${APIKEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo-0125", // Faster + cheaper
//         model: "gpt-4-0125-preview",
        messages: [
          {
            "role": "system",
            "content": customSystemPrompt || `You are an expert ${language} programmer. Return only the source code specified without any extra markup. Do not wrap the code in backticks for markdown. Always return the entire source input with the changes. Always preserve any leading whitespace to maintain a well-tabbed source file.`
          },
          {
            "role": "user",
            "content": context,
          },
          {
            "role": "user",
            "content": prompt
          }
        ],
      }),
    }
  );

  const parsed = await response.json();
  return parsed;
}
