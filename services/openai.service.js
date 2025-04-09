
const axios = require('axios');

/**
 * Service to handle OpenAI API interactions
 */
class OpenAIService {
  /**
   * Generate enhanced content using OpenAI
   * @param {string} prompt - The prompt to send to OpenAI
   * @param {string} systemPrompt - The system prompt to set context
   * @returns {Promise<string>} - Generated content
   */
  static async generateContent(prompt, systemPrompt = "You are a helpful assistant.") {
    try {
      console.log('Generating content with OpenAI...');
      console.log('System prompt:', systemPrompt);
      console.log('User prompt:', prompt);
      
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        },
        {
          headers: { 
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json" 
          }
        }
      );
      
      console.log('OpenAI response received');
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      throw new Error('Failed to generate AI content');
    }
  }
  
  /**
   * Enhance a resume using OpenAI
   * @param {Object} resumeData - The resume data to enhance
   * @returns {Promise<Object>} - Enhanced resume data
   */
  static async enhanceResume(resumeData) {
    const systemPrompt = `
  You are a professional resume writer with expertise in creating compelling and effective resumes.
  Your task is to enhance the resume summary using a confident, first-person tone.
  Use phrases like "I'm", "I have", "My expertise includes", and "I specialize in".
  Make the summary professional, concise (3–5 sentences), and impactful.
  Focus on highlighting the person's key achievements, strengths, and relevant experience.
  `;
  
    let prompt = `Please enhance the following resume using a first-person, confident tone.\n\n`;
  
    // Add personal info context
    prompt += `About Me:\n`;
    if (resumeData.personalInfo) {
      if (resumeData.personalInfo.name) prompt += `Name: ${resumeData.personalInfo.name}\n`;
      if (resumeData.personalInfo.location) prompt += `Location: ${resumeData.personalInfo.location}\n`;
    }
  
    // Add education context
    if (resumeData.education?.length > 0) {
      prompt += `\nEducation:\n`;
      resumeData.education.forEach(edu => {
        if (edu.degree || edu.institution) {
          prompt += `- ${edu.degree || ''} from ${edu.institution || ''} (${edu.date || 'No date'})\n`;
          if (edu.description) prompt += `  ${edu.description}\n`;
        }
      });
    }
  
    // Add work experience
    if (resumeData.experience?.length > 0) {
      prompt += `\nWork Experience:\n`;
      resumeData.experience.forEach(exp => {
        if (exp.position || exp.company) {
          prompt += `- ${exp.position || ''} at ${exp.company || ''} (${exp.date || 'No date'})\n`;
          if (exp.description) prompt += `  ${exp.description}\n`;
        }
      });
    }
  
    // Add skills
    if (resumeData.skills?.length > 0) {
      prompt += `\nSkills:\n`;
      resumeData.skills.forEach(skill => {
        if (skill.category || skill.skills) {
          prompt += `- ${skill.category || 'Skills'}: ${skill.skills}\n`;
        }
      });
    }
  
    // Include or generate summary
    if (resumeData.summary) {
      prompt += `\nCurrent Summary:\n${resumeData.summary}\n\nPlease rewrite the summary to be more professional, using confident first-person language.`;
    } else {
      prompt += `\nPlease generate a new summary based on the information above, using a confident first-person tone (3–5 sentences).`;
    }
  
    try {
      console.log('Sending resume data to OpenAI for enhancement');
      const enhancedSummary = await this.generateContent(prompt, systemPrompt);
  
      return {
        ...resumeData,
        summary: enhancedSummary
      };
    } catch (error) {
      console.error('Resume enhancement error:', error);
      return resumeData;
    }
  }
  
  
  /**
   * Enhance a cover letter using OpenAI
   * @param {Object} coverLetterData - The cover letter data to enhance
   * @returns {Promise<Object>} - Enhanced cover letter data
   */
  static async enhanceCoverLetter(coverLetterData) {
    const systemPrompt = "You are a professional cover letter writer with expertise in creating compelling job application letters. Your task is to create or enhance a cover letter that effectively showcases the applicant's experience, skills, and motivation for the position.";
    
    // Build a comprehensive prompt based on available cover letter information
    let prompt = `Create a professional cover letter based on the following details:`;
    
    // Add personal and recipient info
    if (coverLetterData.personalInfo) {
      prompt += `\n\nApplicant Information:`;
      if (coverLetterData.personalInfo.name) prompt += `\nName: ${coverLetterData.personalInfo.name}`;
      if (coverLetterData.personalInfo.location) prompt += `\nLocation: ${coverLetterData.personalInfo.location}`;
    }
    
    if (coverLetterData.recipientInfo) {
      prompt += `\n\nRecipient Information:`;
      if (coverLetterData.recipientInfo.name) prompt += `\nName: ${coverLetterData.recipientInfo.name}`;
      if (coverLetterData.recipientInfo.title) prompt += `\nTitle: ${coverLetterData.recipientInfo.title}`;
      if (coverLetterData.recipientInfo.company) prompt += `\nCompany: ${coverLetterData.recipientInfo.company}`;
    }
    
    if (coverLetterData.jobInfo) {
      prompt += `\n\nJob Information:`;
      if (coverLetterData.jobInfo.title) prompt += `\nPosition: ${coverLetterData.jobInfo.title}`;
      if (coverLetterData.jobInfo.reference) prompt += `\nReference: ${coverLetterData.jobInfo.reference}`;
    }
    
    // Add existing sections if available
    if (coverLetterData.experience) {
      prompt += `\n\nExisting Experience Section:\n${coverLetterData.experience}`;
    }
    
    if (coverLetterData.skills) {
      prompt += `\n\nExisting Skills Section:\n${coverLetterData.skills}`;
    }
    
    if (coverLetterData.motivation) {
      prompt += `\n\nExisting Motivation Section:\n${coverLetterData.motivation}`;
    }
    
    if (coverLetterData.closing) {
      prompt += `\n\nExisting Closing Section:\n${coverLetterData.closing}`;
    }
    
    // Request format with clear sections
    prompt += `\n\nPlease format the response with four clearly labeled sections:
1) Experience: Highlight relevant work experience and accomplishments
2) Skills: Emphasize key skills relevant to the position
3) Motivation: Explain why the applicant is interested in the position and company
4) Closing: A professional closing statement

Each section should be 1-3 paragraphs. Keep the tone professional yet personable.`;
    
    try {
      console.log('Sending cover letter data to OpenAI for enhancement');
      const generatedContent = await this.generateContent(prompt, systemPrompt);
      
      // Parse the AI response to extract different sections
      const sectionRegex = /(\d+\)|\b)(Experience|Skills|Motivation|Closing)[:\.]/gi;
      let sections = generatedContent.split(sectionRegex);
      
      // Create an enhanced cover letter
      const enhancedData = { ...coverLetterData };
      
      // Find the content for each section
      const findSectionContent = (sectionName) => {
        for (let i = 0; i < sections.length; i++) {
          if (sections[i].toLowerCase().includes(sectionName.toLowerCase()) && i + 1 < sections.length) {
            return sections[i + 1].trim();
          }
        }
        return '';
      };
      
      // Update or set each section
      enhancedData.experience = findSectionContent('Experience') || enhancedData.experience || '';
      enhancedData.skills = findSectionContent('Skills') || enhancedData.skills || '';
      enhancedData.motivation = findSectionContent('Motivation') || enhancedData.motivation || '';
      enhancedData.closing = findSectionContent('Closing') || enhancedData.closing || 'Thank you for considering my application.';
      
      return enhancedData;
    } catch (error) {
      console.error('Cover letter enhancement error:', error);
      return coverLetterData; // Return original data if enhancement fails
    }
  }
}

module.exports = OpenAIService;
