import express from 'express'
import dotenv from 'dotenv'
import identifyRoute from './routes/identify'

dotenv.config()

const app = express()
app.use(express.json())

app.use('/identify', identifyRoute)

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
