import { Telegraf, Markup } from 'telegraf'
import { message } from 'telegraf/filters'
import dotenv from 'dotenv'
import { mongoose } from 'mongoose'
import User from './models/User.js'

// Состояние для каждого пользователя
const userStates = new Map()
let state 

// Загрузка переменных окружения из файла .env
dotenv.config()

//Добавляем пользователя из бота
const newUserAdd = async(userId, username, firstName, lastName) => {  
    console.log('User: ', userId, username, firstName, lastName)
    const existingUser = await User.findOne({ userId })
    if (!existingUser) {
      // Если пользователя нет в базе данных, сохраняем его
      console.log('Add new user, id: ', userId)
      const newUser = new User({
        userId,
        username,
        firstName,
        lastName,
      })
  
      try {
        await newUser.save()
        console.log('User saved successfully.')
      } catch (err) {
        console.error('Error saving user:', err)
      }
    }
  }

// Подключаем mongo
mongoose.connect(process.env.MONGO_SRV)

  const db = mongoose.connection

  db.on('error', console.error.bind(console, 'MongoDB connection error:'))
  db.once('open', () => {
    console.log('Connected to MongoDB')
  })

process.on('SIGINT', () => {
    mongoose.connection.close(() => {
        console.log('Подключение к MongoDB закрыто из-за завершения приложения')
        process.exit(0)
    })
})

// Получаем токен из переменных окружения
const token = process.env.TELEGRAM_BOT_TOKEN

// Создаем экземпляр бота
const bot = new Telegraf(token)

// Меню команд
const commands = [
    { command: '/start', description: 'Перезапустить бота' },
    { command: '/search', description: 'Поиск услуги' },
    { command: '/add', description: 'Добавить услугу' },
    { command: '/lk', description: 'Партнерский кабинет' },
    { command: '/support', description: 'Техподдержка' },
    // Добавьте здесь другие команды
  ]
  
  bot.telegram.setMyCommands(commands)
    .then(() => {
      console.log('Команды установлены')
    })
    .catch(console.error)

// Функция для отправки сообщений по ID
const messageOnId = async(userId, message) => {
    await bot.telegram.sendMessage(userId, message)
    .then(() => {
      console.log('Сообщение успешно отправлено')
    })
    .catch((error) => {
      console.error('Ошибка при отправке сообщения:', error)
    })
  }

  //Меню
const menu = async(ctx) => {   
    try {
      state = {}
      state.selecting = 'SEARCH_TUR' //ключ для обработки ответа
      const userId = JSON.stringify({ ctxValue: ctx.message.from.id})
      console.log('Класс SEARCH_TUR подключен')
      userStates.set(ctx.from.id, state)
      console.log(userStates)
      await ctx.replyWithHTML(`🏔 <b>Текст сообщения</b>`, Markup.inlineKeyboard(
        [
          [Markup.button.callback('🏝 Кнопка 🏝', `buttonName:${userId}`)],    //кнопка с параметром
          [
            Markup.button.webApp('🏝 Миниприложение', 'https://exayna.com')     //кнопка на запуск миниприложения
          ]
        ]
      )) 
    } catch (e) {
      console.error(e)
    }  
  }
  
  // Обработка команды /start
  bot.start(async(ctx) => {
    const startParams = ctx.startPayload  
    if (startParams === 'payget') {
      // Логика для первого параметра
      console.log('Запущена команда payget')
      state = userStates.get(ctx.from.id) || {} 
      try {
        const id = state.bookingId
        console.log(state)
        console.log('ID брони: ', id)
        payment (ctx, id) 
      } catch (e) {
        console.error(e)
      }    
    } else if (startParams === '') {
      menu(ctx)
      const userId = ctx.message.from.id
      const username = ctx.message.from.username
      const firstName = ctx.message.from.first_name
      const lastName = ctx.message.from.last_name
      newUserAdd(userId, username, firstName, lastName)  
    } else {
        state = userStates.get(ctx.from.id) || {} 
        const userId = ctx.message.from.id
        state.turIdLink = startParams
        state.selecting = 'TUR_LINK'
        userStates.set(userId, state)
        console.log(state)
        ctx.reply(`Сколько человек поедет?`)
    }
  })

// Админ-панель
bot.command('adm', async(ctx) => {
    try {
      state = {} 
      console.log('Админ-панель')
      ctx.reply(`Меню:
  /start - перезапуск.
  `) 
    } catch (e) {
      console.error(e)
    }
  })

//Обрабатывает кнопку с параметром
bot.action(/buttonName:(.+)/, async(ctx) => {
    try {         
        const parems = JSON.parse(ctx.match[1]) // Распаковываем переданные данные 
        const UserId = parems.ctxValue      
        console.log('Параметр из кнопки', UserId) 
        ctx.reply(`Твой ID: ${UserId}`)                      
    } catch (e) {
    console.error(e)
    }
  })  

  bot.on(message('text'), async(ctx) => { 
    try {           
    state = userStates.get(ctx.from.id) || {} 
    const messageText = ctx.message.text
    let userId = ctx.message.from.id
    let userName = ctx.message.from.username
    state.userName = userName
    userStates.set(ctx.from.id, state)
    console.log(state)
  
    switch (state.selecting) { 
      case 'ADD_TUR_NAME':    
        state.name = messageText
        state.selecting = 'ADD_TUR_OPERATOR_NAME'         
        userStates.set(ctx.from.id, state)
        await ctx.replyWithHTML(`Шаг 2 из 16
  
  <b>Введите название поставщика услуг (или ФИО для физических лиц)</b>`)
        break
  
      case 'ADD_TUR_OPERATOR_NAME':
        state.operatorName = messageText
        state.selecting = 'ADD_TUR_TYPE'         
        userStates.set(ctx.from.id, state) 
        await ctx.replyWithHTML(`Шаг 3 из 16
  
  <b>Тип услуги (проживание, трансфер, экскурсии и т.д.)</b>`)
          break
          default:
            ctx.reply('Я не понимаю, что вы от меня хотите. Пожалуйста, начните с команды /start.')     
      
      }
    } catch {
        console.error('Ошибка при отправке сообщения:', err)
    }
})

// Запуск бота
bot.launch().then(() => {
    console.log('Бот запущен')
  }).catch((err) => {
    console.error(`Ошибка запуска бота: ${err}`)
  })