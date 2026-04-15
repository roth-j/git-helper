function addCopyButtons() {
  const elements = document.querySelectorAll('a.text-mono.text-small.Link--primary.wb-break-all.mr-2');
  
  elements.forEach(element => {
    if (element.dataset.copyButtonAdded) return;
    
    const copyButton = document.createElement('span');
    copyButton.textContent = '✂️';
    copyButton.style.cursor = 'pointer';
    copyButton.style.marginLeft = '8px';
    copyButton.style.fontSize = '16px';
    copyButton.style.padding = '4px 8px';
    copyButton.style.borderRadius = '6px';
    copyButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    copyButton.style.display = 'inline-block';
    
    copyButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const textToCopy = element.textContent.trim();
      navigator.clipboard.writeText(textToCopy);
      
      copyButton.textContent = '✓';
      setTimeout(() => {
        copyButton.textContent = '✂️';
      }, 1000);
    });
    
    element.parentNode.insertBefore(copyButton, element.nextSibling);
    element.dataset.copyButtonAdded = 'true';
  });
}

addCopyButtons();

const observer = new MutationObserver(() => {
  addCopyButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

