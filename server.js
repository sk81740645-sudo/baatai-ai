const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

// ================================
// MIDDLEWARE
// ================================

app.use(express.json({
  limit: "15mb"
}));

app.use(express.static(__dirname));


// ================================
// HOME
// ================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});


// ================================
// HEALTH CHECK
// ================================

app.get("/api/health", (req, res) => {

  res.json({
    success: true,
    message: "BaatAI server is running",
    groq: !!process.env.GROQ_API_KEY
  });

});


// ================================
// BAATAI CHAT
// ================================

app.post("/api/chat", async (req, res) => {

  try {

    const {
      message,
      image
    } = req.body;


    // --------------------------------
    // CHECK GROQ KEY
    // --------------------------------

    if (!process.env.GROQ_API_KEY) {

      return res.status(500).json({
        success: false,
        error: "GROQ_API_KEY Render Environment Variables mein nahi mili."
      });

    }


    // --------------------------------
    // CHECK MESSAGE
    // --------------------------------

    if (
      (!message || !message.trim()) &&
      !image
    ) {

      return res.status(400).json({
        success: false,
        error: "Message ya image bhejiye."
      });

    }


    // --------------------------------
    // SELECT MODEL
    // --------------------------------

    let model =
      "llama-3.3-70b-versatile";


    // Image hai to vision model
    if (image) {

      model =
        "meta-llama/llama-4-scout-17b-16e-instruct";

    }


    // --------------------------------
    // SYSTEM PROMPT
    // --------------------------------

    const systemMessage = {

      role: "system",

      content: `
You are BaatAI, a friendly and helpful AI Study Assistant.

Your job is to help students and general users with:

- School and college studies
- Programming and coding
- Python
- Mathematics
- English learning
- Indian Constitution
- General knowledge
- Stories
- Shayari
- Writing
- Daily questions
- Ideas and explanations

Important rules:

1. Be helpful and polite.
2. Understand Hindi, Hinglish and English.
3. If the user asks in Hindi, answer mainly in Hindi.
4. If the user asks in Hinglish, answer in simple Hinglish.
5. Explain difficult topics in simple language.
6. For coding questions, provide working code with explanation.
7. Don't unnecessarily make answers very long.
8. Use headings and bullet points when useful.
9. If an image is provided, carefully analyze it and answer according to the user's question.
10. Never reveal your API key or server secrets.

You are BaatAI.
`
    };


    // --------------------------------
    // USER MESSAGE
    // --------------------------------

    let userMessage;


    // TEXT ONLY
    if (!image) {

      userMessage = {
        role: "user",
        content: message
      };

    }


    // TEXT + IMAGE
    else {

      userMessage = {

        role: "user",

        content: [

          {
            type: "text",
            text:
              message ||
              "Is image ko analyze karke mujhe batao."
          },

          {
            type: "image_url",

            image_url: {
              url: image
            }

          }

        ]

      };

    }


    // --------------------------------
    // GROQ REQUEST
    // --------------------------------

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          "Authorization":
            `Bearer ${process.env.GROQ_API_KEY}`

        },

        body: JSON.stringify({

          model: model,

          messages: [
            systemMessage,
            userMessage
          ],

          temperature: 0.7,

          max_completion_tokens: 2048

        })

      }
    );


    // --------------------------------
    // GROQ ERROR
    // --------------------------------

    if (!response.ok) {

      const errorText =
        await response.text();

      console.error(
        "Groq API Error:",
        errorText
      );

      return res.status(response.status).json({

        success: false,

        error:
          "Groq API error",

        details:
          errorText

      });

    }


    // --------------------------------
    // RESPONSE
    // --------------------------------

    const data =
      await response.json();


    const reply =
      data?.choices?.[0]?.message?.content;


    if (!reply) {

      return res.status(500).json({

        success: false,

        error:
          "Groq se valid response nahi mila."

      });

    }


    // --------------------------------
    // SEND TO FRONTEND
    // --------------------------------

    res.json({

      success: true,

      reply: reply,

      model: model

    });


  } catch (error) {

    console.error(
      "BaatAI Server Error:",
      error
    );

    res.status(500).json({

      success: false,

      error:
        "Server mein problem aa gayi.",

      details:
        error.message

    });

  }

});


// ================================
// 404
// ================================

app.use((req, res) => {

  res.status(404).json({

    success: false,

    error: "Page not found"

  });

});


// ================================
// START SERVER
// ================================

app.listen(PORT, () => {

  console.log(
    `BaatAI running on port ${PORT}`
  );

});
