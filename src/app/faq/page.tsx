export default function FAQPage() {
  const faqs = [
    {
      question: "What types of ID photos can I create?",
      answer: "You can create various types of ID photos including passport photos, visa photos, driver's license photos, and more. Our system supports multiple international standards."
    },
    {
      question: "How does the background removal work?",
      answer: "Our advanced AI technology automatically detects and removes the background, ensuring a clean, professional look that meets official requirements."
    },
    {
      question: "What resolution are the output photos?",
      answer: "Photos are generated in high resolution (300 DPI) to meet official requirements for ID documents."
    },
    {
      question: "Can I use the photos for official documents?",
      answer: "Yes, our photos meet the technical requirements for most official documents. However, we recommend checking with your specific authority for their exact requirements."
    },
    {
      question: "How long does it take to process a photo?",
      answer: "Processing typically takes just a few seconds. The exact time depends on your internet connection and image size."
    }
  ]

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h1>
      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">{faq.question}</h3>
              <div className="mt-2 text-gray-600">
                <p>{faq.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
