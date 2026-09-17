const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

/* =========================
   MIDDLEWARE
========================= */

app.use(
  express.json({
    limit: "15mb"
  })
);


/* =========================
   STATIC WEBSITE
========================= */

app.use(
  express.static(__dirname)
);


/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {

  res.json({
    success: true,
    message: "BaatAI server is running",
    groq: !!process.env.GROQ_API_KEY
  });

});


/* =========================
   MAIN CHAT API
========================= */

app.post("/api/chat", async (req, res) => {

  try {

    const apiKey =
      process.env.GROQ_API_KEY;


    /* API KEY CHECK */

    if (!apiKey) {

      return res.status(500).json({
        error:
          "GROQ_API_KEY Render Environment Variables में नहीं मिली।"
      });

    }


    const {
      message = "",
      conversation = [],
      image = null
    } = req.body || {};


    /* MESSAGE CHECK */

    if (
      !message.trim() &&
      !image
    ) {

      return res.status(400).json({
        error:
          "Please enter a message or upload an image."
      });

    }


    /* =========================
       SYSTEM PROMPT
    ========================= */

    const systemPrompt = `
You are BaatAI, a helpful AI assistant.

Your job is to help users with:
- Study
- Coding
- Programming
- Mathematics
- General knowledge
- Writing
- Stories
- Ideas
- Hindi and English
- Everyday questions

Important rules:
1. Be helpful and accurate.
2. Understand Hindi, Hinglish and English.
3. If the user asks in Hindi, preferably answer in Hindi.
4. If the user asks in Hinglish, you may answer in Hinglish.
5. Keep answers clear and easy to understand.
6. For coding questions, provide working code when appropriate.
7. Do not unnecessarily repeat the user's question.
8. Do not mention that you are connected through Groq.
9. Your name is BaatAI.
`;


    /* =========================
       BUILD MESSAGES
    ========================= */

    const messages = [

      {
        role: "system",
        content: systemPrompt
      }

    ];


    /* =========================
       CONVERSATION HISTORY
    ========================= */

    if (
      Array.isArray(conversation)
    ) {

      conversation
        .slice(-20)
        .forEach((item) => {

          if (
            !item ||
            !item.content
          ) {
            return;
          }


          const role =
            item.role === "assistant"
              ? "assistant"
              : "user";


          messages.push({

            role: role,

            content:
              String(item.content)

          });

        });

    }


    /* =========================
       CURRENT USER MESSAGE
    ========================= */

    /*
      अभी image को text के साथ
      context के रूप में भेज रहे हैं।
      Groq model बदलने के बाद
      vision support भी जोड़ा जा सकता है।
    */

    let userContent =
      message.trim();


    if (image) {

      userContent +=
        "\n\n[User has also uploaded an image. Analyze the image if image understanding is available.]";

    }


    messages.push({

      role: "user",

      content:
        userContent ||
        "Please analyze the uploaded image."

    });


    /* =========================
       GROQ REQUEST
    ========================= */

    const groqResponse =
      await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${apiKey}`

          },

          body: JSON.stringify({

            model:
              "llama-3.3-70b-versatile",

            messages:
              messages,

            temperature:
              0.7,

            max_tokens:
              4096

          })

        }
      );


    /* =========================
       GROQ RESPONSE
    ========================= */

    const data =
      await groqResponse.json();


    if (!groqResponse.ok) {

      console.error(
        "Groq API Error:",
        data
      );


      return res.status(
        groqResponse.status
      ).json({

        error:
          data?.error?.message ||
          "Groq API request failed."

      });

    }


    const reply =
      data?.choices?.[0]?.message?.content;


    if (!reply) {

      return res.status(500).json({

        error:
          "Groq ने कोई response नहीं दिया।"

      });

    }


    /* =========================
       SUCCESS
    ========================= */

    res.json({

      success: true,

      reply: reply

    });


  } catch (error) {

    console.error(
      "BaatAI Server Error:",
      error
    );


    res.status(500).json({

      error:
        "BaatAI server में error आया। कृपया थोड़ी देर बाद फिर कोशिश करें।"

    });

  }

});


/* =========================
   ROOT
========================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );

});


/* =========================
   404
========================= */

app.use(
  (req, res) => {

    res.status(404).json({

      error:
        "BaatAI API route not found."

    });

  }
);


/* =========================
   START SERVER
========================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `BaatAI server running on port ${PORT}`
    );

    console.log(
      `Groq API: ${
        process.env.GROQ_API_KEY
          ? "Configured"
          : "NOT CONFIGURED"
      }`
    );

  }
);
