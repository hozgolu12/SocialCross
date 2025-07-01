export interface AdaptedContent {
  content: string;
  hashtags: string[];
  explanation: string;
  link?: string;
  image?: string;
  video?: string; 
  formattedContent?: string;
}

// Helper to extract first link and image URL from content
function extractLinkAndImage(content: string): { cleanedContent: string; link?: string; image?: string } {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const imageRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif))/i;

  let link: string | undefined;
  let image: string | undefined;

  // Find image first
  const imageMatch = content.match(imageRegex);
  if (imageMatch) {
    image = imageMatch[0];
    content = content.replace(image, '').trim();
  }

  // Find first non-image link
  const links = content.match(urlRegex);
  if (links) {
    for (const l of links) {
      if (!image || l !== image) {
        link = l;
        content = content.replace(l, '').trim();
        break;
      }
    }
  }

  return { cleanedContent: content, link, image };
}

export function adaptContent(
  platform: string,
  originalContent: string,
  media?: { images?: string[]; videos?: string[] }
): AdaptedContent {
  const { cleanedContent, link, image } = extractLinkAndImage(originalContent);

  // Get first video if available
  const video = media?.videos && media.videos.length > 0 ? media.videos[0] : undefined;

  switch (platform) {
    case 'twitter': {
      // Twitter does not support direct video upload via API v2 for third-party apps, so just add info
      const maxLength = 280;
      const linkLength = link ? 23 : 0;
      let text = cleanedContent;
      const spaceForText = maxLength - linkLength - 2;

      if (text.length > spaceForText) {
        text = text.substring(0, spaceForText - 3) + '...';
      }

      const finalContent = link ? `${text} ${link}` : text;

      return {
        content: finalContent,
        hashtags: ['social', 'twitter'],
        explanation: 'Trimmed to 280 chars. Link shortened. Added hashtags.',
        link,
        image,
        video // <-- Add this
      };
    }

    case 'telegram': {
      const finalContent = `${cleanedContent}${link ? `\n🔗 ${link}` : ''}${image ? `\n🖼️ ${image}` : ''}${video ? `\n🎬 ${video}` : ''}`;

      return {
        content: finalContent + ' 📢',
        hashtags: ['telegram', 'broadcast'],
        explanation: 'Added emoji, link/image/video previews, and hashtags.',
        link,
        image,
        video // <-- Add this
      };
    }

    case 'reddit': {
      const title = cleanedContent.substring(0, 100) + (cleanedContent.length > 100 ? '...' : '');
      const markdownBody = `${link ? `[Link](${link})\n\n` : ''}${cleanedContent}${image ? `\n\n![image](${image})` : ''}${video ? `\n\n[Video](${video})` : ''}`;

      return {
        content: markdownBody,
        formattedContent: `**${title}**\n\n${markdownBody}`,
        hashtags: ['reddit', 'discussion'],
        explanation: 'Added Reddit formatting. Link, image, and video embedded in Markdown.',
        link,
        image,
        video // <-- Add this
      };
    }

    default:
      return {
        content: originalContent,
        hashtags: [],
        explanation: 'No adaptation performed.',
        link,
        image,
        video // <-- Add this
      };
  }
}