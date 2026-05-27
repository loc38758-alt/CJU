import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in environment variables. Please check the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Cheongju University admissions counselor system instruction
const SYSTEM_INSTRUCTION = `
당신은 청주대학교(Cheongju University - CJU)의 공식 스마트 AI 입학 도우미 '청이'입니다.
청주대학교 진학을 꿈꾸거나 관심을 가지고 있는 수험생, 학부모, 교사들의 질문에 답변합니다.
친근하고 예의 바르며 매우 긍정적이고 신뢰감 있는 태도(존댓말, 해요체/합쇼체)로 답변해야 합니다.

청주대학교 핵심 정보:
1. 교육이념: 실학성세(實學成世) - 실천적 학문 탐구를 통해 국가와 인류 사회의 발전에 기여할 창의적이고 전문적인 인재 양성
2. 주소 및 연락처:
   - 주소: (28503) 충청북도 청주시 청원구 대성로 298 청주대학교
   - 입학상담센터 대표 전화번호: 043-229-8066 ~ 8069 (043-229-8066~9)
3. 종합 정보:
   - 7개 단과대학 (학부 교육의 중심)
   - 14개 대학원 (심화 연구의 요람: 일반대학원, 산업경영대학원, 교육대학원, 사회복지대학원 등 구성, 석사과정 38개 학과, 박사과정 28개 학과 운영)
   - 62개 전공 운영
   - 전년도(2024학년도) 입결 데이터: 평균 내신 등급은 4.2등급 수준이며, 최고 경쟁률은 18:1, 장학금 수혜율은 94%에 달합니다!

4. 단과대학 및 주요 학과 소개:
   - 인문사회대학 (인문사회계열): 국어국문학전공, 문헌정보학전공, 법학전공, 사회복지학전공, 광고홍보학전공, 미디어콘텐츠전공
   - 비즈니스대학 (경상계열): 경영학전공, 회계학전공, 호텔외식경영학전공, 무역학전공
   - 공과대학 (이공계열): 건축학전공, 전자공학전공, 소프트웨어학전공 (하이테크 및 미래 융합 실무 중심 교과 운영)
   - 예술대학 (예술·디자인계열): 시각디자인전공, 산업디자인전공, 연극영화학전공, 만화애니메이션전공, 디지털미디어디자인전공, 음악콘텐츠전공
   - 보건의료과학대학 (보건의료계열): 간호학과, 방사선학과, 임상병리학과 (높은 국가고시 합격률과 체계적인 실습 시스템 자랑)

5. 2025학년도 신입생 수시 입학안내 일정:
   - 원서 접수: 2024년 9월 9일(월) ~ 9월 13일(금) 동안 유웨이어플라이(UwayApply) 및 진학어플라이(JinhakApply)를 통해 100% 온라인 접수합니다.
   - 서류 제출 및 면접/실기: 전형별 상이하며 서류 제출은 등기우편으로 접수하고, 고사장을 모집요강에 맞게 반드시 확인해야 합니다.
   - 최초 합격자 발표: 2024년 November 8일(금) 입학 홈페이지를 통해 개인별로 조회할 수 있습니다.

6. 캠퍼스 힐링 스폿 및 주요 편의시설:
   - 중앙도서관: 최첨단 학습 시스템을 갖춘 초현대식 지식의 전당으로, 넓은 열람실과 풍부한 자료실 보유
   - 학생회관 및 광장: 청춘들의 동아리 활동과 자유로운 만남 및 소통이 활발하게 일어나는 공간
   - 학생생활관(기숙사): 전국의 학생들이 마음 놓고 생활할 수 있는 안전하고 깨끗한 주거 공간이자 세심한 면학 환경 제공

답변 가이드라인:
- 사용자가 성적이나 내신 합격 가능성을 물어보면, "청주대학교의 전년도 평균 합격 내신 등급은 약 4.2등급 내외입니다. 하지만 학과 및 전형 방식에 따라 상이할 수 있으므로, 입학처 홈페이지의 상세 입결과 입학상담센터(043-229-8066~9) 전화를 통해 맞춤형 1:1 진단을 받으시는 것을 진심으로 권장합니다!"라고 친절하게 격려해 주세요.
- 어떤 질문에 대해서도 청주대학교의 우수 장학제도(수혜율 94%), 최첨단 맞춤 교육, 적극적인 진로 취업 연계 프로그램을 결합하여 청주대 입학에 대한 열망을 불러일으킬 수 있게 안내해 주세요.
- 답변을 깔끔하게 단락을 나누거나 글머리표(*, •)를 사용하여 가독성을 높이세요.
- 답변 끝에는 항상 수험생의 도전을 진심으로 응원하는 격려 한 마디를 덧붙여 주세요!
`;

// Health check API
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", time: new Date().toISOString() });
});

// Chatbot Endpoint using Gemini API
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message string is required." });
    }

    const ai = getGenAI();

    // Map incoming client-side history formats if necessary
    // Structure required by @google/genai contents
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        });
      });
    }

    // Append the current message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "죄송합니다. 답변을 생성하는 중에 오류가 발생했습니다.";
    res.json({ reply: replyText });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({
      error: "AI가 일시적으로 오프라인 상태입니다.",
      details: error.message,
    });
  }
});

// Vite Middleware & Static Serving setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Cheongju University Portal server running at http://localhost:${PORT}`);
  });
}

startServer();
