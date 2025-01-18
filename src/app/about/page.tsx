export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">About IDPhotoGraphic</h1>
      <div className="prose prose-lg text-gray-600">
        <p>
          IDPhotoGraphic is a cutting-edge solution for creating professional ID photos
          with ease. Our platform combines advanced image processing technology with
          user-friendly tools to deliver high-quality results.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-8">Our Mission</h2>
        <p>
          We aim to simplify the process of creating ID photos while maintaining the
          highest standards of quality and precision.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-8">Features</h2>
        <ul>
          <li>Automatic background removal</li>
          <li>Precise cropping tools</li>
          <li>Multiple aspect ratio options</li>
          <li>High-resolution downloads</li>
        </ul>
      </div>
    </div>
  )
}
