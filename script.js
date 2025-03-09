const input = document.getElementById('fileInput')
const textInput = document.getElementById('textInput')
const output = document.getElementById('output')

// Uploading Filea
input.addEventListener('change', () => {
    const fileName = input.files[0].name.length > 0 ? input.files[0].name : 'No file selected'
    document.getElementById('fileName').textContent = fileName
})

function analyze() {
    input.files[0] ? extractText() : textOnly(textInput.value.toLowerCase())
}

async function textOnly(textInput) {

    document.getElementById('textInput').value = ""

    output.innerText = "Analyzing Content..."
    document.getElementById('text-output').style.display = "flex"
    document.getElementById('non-text-output').style.display = "none"
    const NLPResult = await NLPServer(textInput)

    const sentiment = parseFloat(Math.min(Math.abs(NLPResult.Sentiment_Score), 1).toFixed(2))
    const subjectivity = parseFloat((NLPResult.Subjectivity_Score).toFixed(2))
    const readability = parseFloat((Math.abs(NLPResult.Readability_Score - 0.5) / 0.5).toFixed(2))
    const misleading = parseFloat((NLPResult.FB_Bart_Model).toFixed(2))

    const NLPFinal = ((0.25 * sentiment + 0.25 * subjectivity + 0.2 * readability + 0.3 * misleading).toFixed(2))

    document.getElementById('sentimentOutput').innerText = `${(sentiment * 100).toFixed(0)}%`
    document.getElementById('subjectivityOutput').innerText = `${(subjectivity * 100).toFixed(0)}%`
    document.getElementById('readabilityOutput').innerText = `${(readability * 100).toFixed(0)}%`
    document.getElementById('misleadingOutput').innerText = `${(misleading * 100).toFixed(0)}%`
    document.getElementById('NLPFinal').innerText = `${(NLPFinal * 100).toFixed(0)}%`
    output.innerText = ""

    const senCard = document.getElementById('sentiment-card')
    const subCard = document.getElementById('subjectivity-card')
    const readCard = document.getElementById('readability-card')
    const misCard = document.getElementById('misleading-card')
    const finCard = document.getElementById('final-score-container')

    if (sentiment == 0) {senCard.style.backgroundColor = "lightgreen"}
    else if (sentiment > 0 && sentiment < 0.5) {senCard.style.backgroundColor = "palegoldenrod"} 
    else {senCard.style.backgroundColor = "indianred"}

    if (subjectivity == 0) {subCard.style.backgroundColor = "lightgreen"}
    else if (subjectivity > 0 && subjectivity < 0.5) {subCard.style.backgroundColor = "palegoldenrod"} 
    else {subCard.style.backgroundColor = "indianred"}

    if (readability == 0) {senCard.style.backgroundColor = "lightgreen"}
    else if (readability > 0 && readability < 0.5) {readCard.style.backgroundColor = "palegoldenrod"} 
    else {readCard.style.backgroundColor = "indianred"}

    if (misleading == 0) {misCard.style.backgroundColor = "lightgreen"}
    else if (misleading > 0 && misleading < 0.5) {misCard.style.backgroundColor = "palegoldenrod"} 
    else {misCard.style.backgroundColor = "indianred"}

    const remark = document.getElementById('remark')
    if (NLPFinal < 0.2) {
        finCard.style.backgroundColor = "lightgreen"
        remark.innerText = "Should be safe, proceed with caution."
    }
    else if (NLPFinal < 0.6) {
        finCard.style.backgroundColor = "palegoldenrod"
        remark.innerText = "Likely to be fake."
    } 
    else {
        finCard.style.backgroundColor = "indianred"
        remark.innerText = "Highly likely to be fake."
    }


}

// OCR for Text Extraction
async function extractText() {

    const inputFile = input.files[0];
    const fileUrl = URL.createObjectURL(inputFile) // Convert file into a URL

    try {

        output.innerText = "Processing Image..."

        // log OCR process
        const { data: { text } } = await Tesseract.recognize(fileUrl, 'eng', {
            logger: m => console.log(m) 
        });

        // deciding non-text image or text image
        const words = text.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/)
        const validWords = words.filter(word => word.length > 1)

        output.innerText = "Analyzing Content..."

        if (validWords.length >= 3) {

            textOnly(text)

        } else {

            document.getElementById('non-text-output').style.display = "flex"
            document.getElementById('text-output').style.display = "none"

            const AIScore = await checkAI(inputFile)
            const deepfakeScore = await checkDeepfake(inputFile)
            output.innerText = ""

            // display on UI
            document.getElementById('AIOutput').innerText = `${(parseFloat(AIScore) * 100).toFixed(0)}%`
            document.getElementById('deepfakeOutput').innerText = `${(parseFloat(deepfakeScore) * 100).toFixed(0)}%`
            
            const AIcard = document.getElementById('AI-card')
            const deepfakeCard = document.getElementById('deepfake-card')

            if (AIScore == 0) {misCard.style.backgroundColor = "lightgreen"}
            else if (AIScore > 0 && AIScore < 0.5) {AIcard.style.backgroundColor = "palegoldenrod"} 
            else {AIcard.style.backgroundColor = "indianred"}
        
            if (deepfakeScore == 0) {deepfakeCard.style.backgroundColor = "lightgreen"}
            else if (deepfakeScore > 0 && deepfakeScore < 0.5) {deepfakeCard.style.backgroundColor = "palegoldenrod"} 
            else {deepfakeCard.style.backgroundColor = "indianred"}
        

            
            
            // remark
            const remark = document.getElementById('remark')
            if (AIScore > 0.8 || deepfakeScore > 0.8) {
                remark.innerText = "Highly likely to be fake."
            } else if (AIScore > 0.5 || deepfakeScore > 0.5) {
                remark.innerText = "Likely to be fake."
            } else {
                remark.innerText = "Should be safe, proceed with caution."
            }

        }

        fileName.innerText = ""
        input.value = null

            

    } catch (error) {
        output.innerText = "Error: " + error.message
    }

}




// Deepfake Analysis
async function checkDeepfake(inputFile) {
    const url = new URL("https://api.sightengine.com/1.0/check.json")
    const SE_API_USER = "34293766"  // sightengine API
    const SE_API_SECRET = "c4voDsCLKkuz7kaADgpbWF3f3dt7HRuy"

    const formData = new FormData()
    formData.append("media", inputFile)
    formData.append("models", "deepfake")
    formData.append("api_user", SE_API_USER)
    formData.append("api_secret", SE_API_SECRET)

    try {
        const response = await fetch(url, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const result = await response.json()

        return result.type.deepfake

    } catch (error) {
        console.error("Error:", error.message)
    }
}

// AI Analysis
async function checkAI(inputFile) {
    const url = new URL("https://api.sightengine.com/1.0/check.json")
    const SE_API_USER = "34293766" // sightengine API
    const SE_API_SECRET = "c4voDsCLKkuz7kaADgpbWF3f3dt7HRuy"

    const formData = new FormData()
    formData.append("media", inputFile)
    formData.append("models", "genai")
    formData.append("api_user", SE_API_USER)
    formData.append("api_secret", SE_API_SECRET)

    try {
        const response = await fetch(url, {
            method: "POST",
            body: formData
        })

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const result = await response.json();

        return result.type.ai_generated

    } catch (error) {
        console.error("Error:", error.message)
    }
}


async function NLPServer(text) {
    try {
        let response = await fetch("https://checklah-server.onrender.com/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text })
        });

        console.log("🔄 Raw response object:", response)

        if (!response.ok) {
            throw new Error(`❌ HTTP error! Status: ${response.status}`)
        }

        let result = await response.json()
        console.log("✅ Response from server:", result)

        return result

    } catch (error) {
        console.error("🚨 Error:", error)
        alert("❌ Failed to process the image. Please try again.")
    }
}



