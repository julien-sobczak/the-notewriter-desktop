import React from 'react'

type QuestionProps<T> = {
  question: string
  choices: T[]
  renderChoice: (choice: T) => React.ReactNode
  onChoiceSelected: (choice: T) => void
}

function Question<T>({ question, choices, renderChoice, onChoiceSelected }: QuestionProps<T>) {
  return (
    <div className="Question">
      <h2>{question}</h2>
      <ul>
        {choices.map((choice, index) => (
          <li key={index} onClick={() => onChoiceSelected(choice)}>
            {renderChoice(choice)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Question
